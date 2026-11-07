package com.gces.placementcell.service;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.NotificationRecipientRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Emails the students who meet a newly posted job's criteria.
 *
 * Runs after the job has been committed and off the request thread, so a slow or broken
 * mail server can never fail or delay posting a job. Each student gets their own message,
 * so no one sees anyone else's address.
 */
@Service
@Slf4j
public class JobNotificationService {

    /** Students already placed or blocked are not alerted about new drives. */
    private static final Set<PlacementStatus> ALERTABLE = Set.of(PlacementStatus.PENDING, PlacementStatus.ACTIVE);
    private static final DateTimeFormatter DEADLINE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);

    private final JobRepository jobRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;
    private final EmailJsMailer mailer;
    private final boolean enabled;
    private final String frontendUrl;
    private final NotificationDispatcher notificationDispatcher;

    @Autowired
    public JobNotificationService(JobRepository jobRepository,
                                  StudentProfileRepository studentProfileRepository,
                                  NotificationRecipientRepository recipientRepository,
                                  UserRepository userRepository,
                                  TransactionTemplate transactionTemplate,
                                  EmailJsMailer mailer,
                                  @Value("${app.mail.enabled:false}") boolean enabled,
                                  @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
                                  NotificationDispatcher notificationDispatcher) {
        this.notificationDispatcher = notificationDispatcher;
        this.jobRepository = jobRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
        this.transactionTemplate = transactionTemplate;
        this.mailer = mailer;
        this.enabled = enabled;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    public JobNotificationService(JobRepository jobRepository,
                                  StudentProfileRepository studentProfileRepository,
                                  TransactionTemplate transactionTemplate,
                                  EmailJsMailer mailer,
                                  boolean enabled,
                                  String frontendUrl,
                                  NotificationDispatcher notificationDispatcher) {
        this(jobRepository, studentProfileRepository, null, null, transactionTemplate, mailer, enabled, frontendUrl, notificationDispatcher);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onJobPosted(JobPostedEvent event) {
        try {
            notifyEligibleStudents(event.jobId());
        } catch (RuntimeException ex) {
            // Nothing upstream is waiting on this thread; log so the failure is not silent.
            log.error("Job alert emails for job {} failed: {}", event.jobId(), ex.getMessage(), ex);
        }
    }

    /**
     * Notifies the eligible students in-app (always) and by email (when mail is configured).
     * Returns how many emails were sent. Package-private so tests can call it directly.
     */
    int notifyEligibleStudents(Long jobId) {
        Alert alert = transactionTemplate.execute(status -> buildAlert(jobId));
        if (alert == null || alert.recipients().isEmpty()) {
            log.info("Job {} posted; no eligible students to notify.", jobId);
            return 0;
        }
        publishInApp(alert);
        return sendEmails(alert);
    }

    private void publishInApp(Alert alert) {
        Long posterId = alert.createdByUserId();
        if (posterId == null && userRepository != null) {
            posterId = userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN).stream()
                    .findFirst().map(User::getId).orElse(null);
        }
        if (posterId == null) {
            log.warn("Job {} has no poster; in-app notifications skipped.", alert.jobId());
            return;
        }
        StringBuilder message = new StringBuilder(alert.company()).append(" is hiring for ").append(alert.role()).append('.');
        if (alert.location() != null && !alert.location().isBlank()) {
            message.append(" Location: ").append(alert.location()).append('.');
        }
        if (alert.ctc() != null && !alert.ctc().isBlank()) {
            message.append(" Package: ").append(alert.ctc()).append('.');
        }
        if (alert.deadline() != null) {
            message.append(" Apply before ").append(alert.deadline()).append('.');
        }
        message.append(" This drive matches your profile.");

        String title = singleLine("New job drive: " + alert.role() + " at " + alert.company());
        if (title.length() > 200) {
            title = title.substring(0, 197) + "...";
        }

        // Email is sent below with the richer job template, so the dispatcher stores in-app only.
        notificationDispatcher.dispatch(new UserNotificationEvent(
                alert.recipients().stream().map(Recipient::userId).filter(java.util.Objects::nonNull).toList(),
                posterId,
                title,
                message.toString(),
                NotificationType.JOB,
                NotificationPriority.NORMAL,
                alert.jobId(),
                "/student/jobs/" + alert.jobId(),
                false));
    }

    private int sendEmails(Alert alert) {
        Long jobId = alert.jobId();
        if (!enabled) {
            log.info("Job {} posted; email alerts are disabled (app.mail.enabled=false).", jobId);
            return 0;
        }
        if (!mailer.isConfigured()) {
            log.warn("Job {} posted but email alerts are on and EmailJS is not configured.", jobId);
            return 0;
        }

        int sent = 0;
        int failed = 0;
        for (Recipient recipient : alert.recipients()) {
            // A student who has not done first-login setup has only a stand-in address.
            if (StudentIdentity.isPlaceholderEmail(recipient.email())) {
                continue;
            }
            try {
                // Admin-typed text is in the subject; the mailer keeps it on one line.
                mailer.send(recipient.email(), recipient.firstName(),
                        singleLine("New job drive: " + alert.role() + " at " + alert.company()), buildBody(alert, recipient));
                sent++;
            } catch (EmailJsMailer.EmailDeliveryException ex) {
                failed++;
                log.warn("Could not email an eligible student for job {}: {}", jobId, ex.getMessage());
            }
        }
        log.info("Job {} alert emails: {} sent, {} failed.", jobId, sent, failed);
        return sent;
    }

    private Alert buildAlert(Long jobId) {
        Job job = jobRepository.findWithDetailsByIdAndIsDeletedFalse(jobId).orElse(null);
        if (job == null || !job.isOpen()) {
            return null;
        }
        Set<Long> alreadyNotified = recipientRepository != null
                ? recipientRepository.findNotifiedUserIdsByJobId(jobId)
                : Set.of();
        List<Recipient> recipients = studentProfileRepository.findNotifiableStudents(ALERTABLE).stream()
                .filter(student -> JobEligibility.isEligible(student, job))
                .map(JobNotificationService::toRecipient)
                .filter(r -> r.userId() == null || !alreadyNotified.contains(r.userId()))
                .toList();

        return new Alert(
                job.getId(),
                job.getPostedBy() != null ? job.getPostedBy().getId() : null,
                job.getCompany() != null ? job.getCompany().getName() : "a company",
                job.getJobRole(),
                job.getLocation(),
                job.getCtcText(),
                job.getMinCgpa() != null ? job.getMinCgpa().stripTrailingZeros().toPlainString() : null,
                job.getApplicationDeadline() != null ? DEADLINE_FORMAT.format(job.getApplicationDeadline()) : null,
                recipients);
    }

    private static Recipient toRecipient(StudentProfile student) {
        String name = student.getFullName() == null || student.getFullName().isBlank()
                ? "Student" : student.getFullName().trim().split("\\s+")[0];
        return new Recipient(student.getUser() != null ? student.getUser().getId() : null, student.getEmail(), name);
    }

    private String buildBody(Alert alert, Recipient recipient) {
        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(recipient.firstName()).append(",\n\n")
                .append("A new placement drive that matches your profile has been posted.\n\n")
                .append("Company: ").append(alert.company()).append('\n')
                .append("Role: ").append(alert.role()).append('\n');
        appendIfPresent(body, "Location", alert.location());
        appendIfPresent(body, "Package", alert.ctc());
        appendIfPresent(body, "Minimum CGPA", alert.minCgpa());
        appendIfPresent(body, "Apply before", alert.deadline());
        body.append("\nView the details and apply: ").append(frontendUrl).append("/student/jobs/").append(alert.jobId())
                .append("\n\nGCE Srirangam Placement Cell\n");
        return body.toString();
    }

    private static void appendIfPresent(StringBuilder body, String label, String value) {
        if (value != null && !value.isBlank()) {
            body.append(label).append(": ").append(value).append('\n');
        }
    }

    private static String singleLine(String value) {
        return value.replaceAll("[\\r\\n]+", " ").trim();
    }

    private record Recipient(Long userId, String email, String firstName) {
    }

    private record Alert(Long jobId, Long createdByUserId, String company, String role, String location, String ctc,
                         String minCgpa, String deadline, List<Recipient> recipients) {
    }
}
