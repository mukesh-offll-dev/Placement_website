package com.gces.placementcell.service;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.TargetAudience;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.NotificationRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;

/**
 * Delivers a {@link UserNotificationEvent}: one in-app notification (shown in the bell and the
 * Notifications page) per recipient, plus the same text by email when the event asks for it.
 *
 * Runs after the publishing transaction commits and off the request thread, so a failing mail
 * server, or a bad recipient, can never fail the action that triggered the notification.
 * The in-app row is written first and does not depend on mail being configured.
 */
@Service
@Slf4j
public class NotificationDispatcher {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final TransactionTemplate transactionTemplate;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean mailEnabled;
    private final String configuredFrom;
    private final String smtpUsername;
    private final String frontendUrl;

    public NotificationDispatcher(NotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  JobRepository jobRepository,
                                  TransactionTemplate transactionTemplate,
                                  ObjectProvider<JavaMailSender> mailSenderProvider,
                                  @Value("${app.mail.enabled:false}") boolean mailEnabled,
                                  @Value("${app.mail.from:}") String configuredFrom,
                                  @Value("${spring.mail.username:}") String smtpUsername,
                                  @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.transactionTemplate = transactionTemplate;
        this.mailSenderProvider = mailSenderProvider;
        this.mailEnabled = mailEnabled;
        this.configuredFrom = configuredFrom;
        this.smtpUsername = smtpUsername;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    /** fallbackExecution: callers that are not inside a transaction still get delivery. */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotification(UserNotificationEvent event) {
        try {
            dispatch(event);
        } catch (RuntimeException ex) {
            log.error("Notification '{}' could not be delivered: {}", event.title(), ex.getMessage(), ex);
        }
    }

    /** Returns how many users received the in-app notification. Public so async callers can reuse it. */
    public int dispatch(UserNotificationEvent event) {
        if (event.recipientUserIds() == null || event.recipientUserIds().isEmpty()) {
            return 0;
        }
        List<String> emails = transactionTemplate.execute(status -> store(event));
        if (emails == null || emails.isEmpty()) {
            return 0;
        }
        if (event.sendEmail()) {
            sendEmails(event, emails);
        }
        return emails.size();
    }

    /** Saves the notification and its recipient rows; returns the recipients' email addresses. */
    private List<String> store(UserNotificationEvent event) {
        User creator = userRepository.findById(event.createdByUserId()).orElse(null);
        if (creator == null) {
            log.warn("Notification '{}' skipped: creating user {} not found.", event.title(), event.createdByUserId());
            return List.of();
        }
        List<User> recipients = userRepository.findAllById(new HashSet<>(event.recipientUserIds())).stream()
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()) && !Boolean.FALSE.equals(u.getIsActive()))
                .toList();
        if (recipients.isEmpty()) {
            return List.of();
        }

        LocalDateTime now = LocalDateTime.now();
        Notification notification = Notification.builder()
                .title(truncate(singleLine(event.title()), 200))
                .message(truncate(event.message(), 4000))
                .notificationType(event.type())
                .priority(event.priority())
                .targetAudience(TargetAudience.SPECIFIC_USERS)
                .status(NotificationStatus.PUBLISHED)
                .createdBy(creator)
                .publishedAt(now)
                .build();
        if (event.relatedJobId() != null) {
            notification.setRelatedJob(jobRepository.getReferenceById(event.relatedJobId()));
        }
        recipients.forEach(notification::addRecipient);
        notificationRepository.save(notification);

        return recipients.stream().map(User::getEmail).filter(Objects::nonNull).toList();
    }

    private void sendEmails(UserNotificationEvent event, List<String> emails) {
        if (!mailEnabled) {
            log.info("Notification '{}' stored in-app; email is disabled (app.mail.enabled=false).", event.title());
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        String from = (configuredFrom == null || configuredFrom.isBlank()) ? smtpUsername : configuredFrom;
        if (sender == null || from == null || from.isBlank()) {
            log.warn("Notification '{}' stored in-app but the mail sender/from address is not configured.", event.title());
            return;
        }

        int sent = 0;
        int failed = 0;
        for (String email : emails) {
            try {
                sender.send(buildMessage(from, email, event));
                sent++;
            } catch (MailException ex) {
                failed++;
                log.warn("Could not email notification '{}' to a recipient: {}", event.title(), ex.getMessage());
            }
        }
        log.info("Notification '{}' emails: {} sent, {} failed.", event.title(), sent, failed);
    }

    private SimpleMailMessage buildMessage(String from, String to, UserNotificationEvent event) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        // Titles carry user-typed text (company, role), so line breaks must not reach the header.
        message.setSubject(singleLine(event.title()));
        StringBuilder body = new StringBuilder("Hello,\n\n").append(event.message()).append('\n');
        if (event.linkPath() != null && !event.linkPath().isBlank()) {
            body.append("\nOpen in the portal: ").append(frontendUrl).append(event.linkPath()).append('\n');
        }
        body.append("\nGCE Srirangam Placement Cell\n");
        message.setText(body.toString());
        return message;
    }

    private static String singleLine(String value) {
        return value == null ? "" : value.replaceAll("[\\r\\n]+", " ").trim();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }
}
