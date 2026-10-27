package com.gces.placementcell.service;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
    private final TransactionTemplate transactionTemplate;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean enabled;
    private final String configuredFrom;
    private final String smtpUsername;
    private final String frontendUrl;

    public JobNotificationService(JobRepository jobRepository,
                                  StudentProfileRepository studentProfileRepository,
                                  TransactionTemplate transactionTemplate,
                                  ObjectProvider<JavaMailSender> mailSenderProvider,
                                  @Value("${app.mail.enabled:false}") boolean enabled,
                                  @Value("${app.mail.from:}") String configuredFrom,
                                  @Value("${spring.mail.username:}") String smtpUsername,
                                  @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.jobRepository = jobRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.transactionTemplate = transactionTemplate;
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.configuredFrom = configuredFrom;
        this.smtpUsername = smtpUsername;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onJobPosted(JobPostedEvent event) {
        try {
            notifyEligibleStudents(event.jobId());
        } catch (RuntimeException ex) {
            // Nothing upstream is waiting on this thread; log so the failure is not silent.
            log.error("Job alert emails for job {} failed: {}", event.jobId(), ex.getMessage(), ex);
        }
    }

    /** Returns how many emails were sent. Package-private so tests can call it directly. */
    int notifyEligibleStudents(Long jobId) {
        if (!enabled) {
            log.info("Job {} posted; email alerts are disabled (app.mail.enabled=false).", jobId);
            return 0;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        String from = (configuredFrom == null || configuredFrom.isBlank()) ? smtpUsername : configuredFrom;
        if (sender == null || from == null || from.isBlank()) {
            log.warn("Job {} posted but email alerts are on and the mail sender/from address is not configured.", jobId);
            return 0;
        }

        Alert alert = transactionTemplate.execute(status -> buildAlert(jobId));
        if (alert == null || alert.recipients().isEmpty()) {
            log.info("Job {} posted; no eligible students to email.", jobId);
            return 0;
        }

        int sent = 0;
        int failed = 0;
        for (Recipient recipient : alert.recipients()) {
            try {
                sender.send(buildMessage(from, alert, recipient));
                sent++;
            } catch (MailException ex) {
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
        List<Recipient> recipients = studentProfileRepository.findNotifiableStudents(ALERTABLE).stream()
                .filter(student -> JobEligibility.isEligible(student, job))
                .map(JobNotificationService::toRecipient)
                .toList();

        return new Alert(
                job.getId(),
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
        return new Recipient(student.getEmail(), name);
    }

    private SimpleMailMessage buildMessage(String from, Alert alert, Recipient recipient) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient.email());
        // Admin-typed text goes into a header, so line breaks must not survive (header injection).
        message.setSubject(singleLine("New job drive: " + alert.role() + " at " + alert.company()));
        message.setText(buildBody(alert, recipient));
        return message;
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

    private record Recipient(String email, String firstName) {
    }

    private record Alert(Long jobId, String company, String role, String location, String ctc,
                         String minCgpa, String deadline, List<Recipient> recipients) {
    }
}
