package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.*;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Job and Application Module Entities Test")
class JobAndApplicationEntitiesTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    private User adminUser() {
        return User.builder()
                .id(2L)
                .email("officer@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.PLACEMENT_OFFICER)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
    }

    private Company googleCompany() {
        return Company.builder()
                .id(1L)
                .name("Google")
                .shortName("GO")
                .logoColor("#1a73e8")
                .build();
    }

    private Job sampleJob() {
        return Job.builder()
                .company(googleCompany())
                .jobRole("Software Development Engineer")
                .jobDescription("Build scalable distributed systems.")
                .location("Bangalore")
                .ctcText("24 LPA")
                .ctcValue(new BigDecimal("2400000.00"))
                .jobType(EmploymentType.FULL_TIME)
                .minCgpa(new BigDecimal("8.00"))
                .vacancies(10)
                .applicationDeadline(LocalDate.now().plusMonths(1))
                .postedBy(adminUser())
                .status(JobStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Job maps to the normalised jobs table and applies its defaults")
    void testJobEntityCreationAndHelpers() {
        Job job = sampleJob();
        job.onCreate();

        assertEquals("Software Development Engineer", job.getJobRole());
        assertEquals("Google", job.getCompany().getName());
        assertEquals("24 LPA", job.getCtcText());
        assertEquals(new BigDecimal("2400000.00"), job.getCtcValue());
        assertEquals(10, job.getVacancies());
        assertEquals(EmploymentType.FULL_TIME, job.getJobType());
        assertEquals(JobStatus.ACTIVE, job.getStatus());

        // defaults filled in by @PrePersist for the NOT NULL columns
        assertEquals(LocalDate.now(), job.getPostedDate());
        assertTrue(job.getIsActive());
        assertFalse(job.getBacklogsAllowed());
        assertFalse(job.getIsDeleted());
        assertNotNull(job.getCreatedAt());
        assertNotNull(job.getUpdatedAt());

        assertFalse(job.isExpired());
        assertTrue(job.isOpen());

        // application_deadline >= posted_date  (chk_jobs_deadline)
        assertFalse(job.getApplicationDeadline().isBefore(job.getPostedDate()));

        Set<ConstraintViolation<Job>> violations = validator.validate(job);
        assertTrue(violations.isEmpty(), "Job entity should have no constraint violations");
    }

    @Test
    @DisplayName("Job requires a company and a posting user, matching the NOT NULL foreign keys")
    void testJobRequiresMandatoryForeignKeys() {
        Job job = sampleJob();
        job.setCompany(null);
        job.setPostedBy(null);

        Set<ConstraintViolation<Job>> violations = validator.validate(job);
        assertEquals(2, violations.size(), "Both company and postedBy are mandatory");
    }

    @Test
    @DisplayName("Job skills and requirements are normalised into child rows, not CSV")
    void testJobSkillsAndRequirementsAreNormalised() {
        Job job = sampleJob();
        job.onCreate();

        job.addSkill(JobSkill.builder().skillName("Java").build());
        job.addSkill(JobSkill.builder().skillName("Spring Boot").build());
        job.addRequirement(JobRequirement.builder()
                .requirement("B.E/B.Tech in CSE or IT")
                .displayOrder((short) 1)
                .build());

        assertEquals(2, job.getSkills().size());
        assertEquals(1, job.getRequirements().size());
        assertSame(job, job.getSkills().get(0).getJob());
        assertSame(job, job.getRequirements().get(0).getJob());
        assertEquals("Java", job.getSkills().get(0).getSkillName());
    }

    @Test
    @DisplayName("JobApplication records consent and applied_on")
    void testJobApplicationEntityCreationAndRelationships() {
        User student = User.builder()
                .id(1L)
                .email("student@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .build();

        StudentProfile profile = StudentProfile.builder()
                .id(10L)
                .user(student)
                .fullName("Alex Harrison")
                .email("student@gces.edu")
                .rollNo("220CSE001")
                .build();

        JobApplication application = JobApplication.builder()
                .job(sampleJob())
                .studentProfile(profile)
                .status(ApplicationStatus.APPLIED)
                .coverLetter("Excited to apply for this opportunity.")
                .resumeUrl("https://storage.example.com/resumes/alex.pdf")
                .consentGiven(true)
                .build();

        application.onCreate();

        assertEquals(profile, application.getStudentProfile());
        assertEquals(ApplicationStatus.APPLIED, application.getStatus());
        assertTrue(application.getConsentGiven());
        assertEquals("Application Submitted", application.getCurrentStage());
        assertNotNull(application.getAppliedOn());
        assertNotNull(application.getCreatedAt());
        assertNotNull(application.getUpdatedAt());

        Set<ConstraintViolation<JobApplication>> violations = validator.validate(application);
        assertTrue(violations.isEmpty(), "JobApplication entity should have no constraint violations");
    }

    @Test
    @DisplayName("ApplicationTimeline uses stage_label, display_order and created_at")
    void testApplicationTimelineCreation() {
        JobApplication application = JobApplication.builder()
                .id(200L)
                .status(ApplicationStatus.UNDER_REVIEW)
                .build();

        ApplicationTimeline timeline = ApplicationTimeline.builder()
                .jobApplication(application)
                .stageLabel("Technical Interview")
                .stageDate(LocalDate.now().plusDays(3))
                .status(TimelineStatus.UPCOMING)
                .remarks("Scheduled for next Tuesday 10:00 AM")
                .displayOrder((short) 3)
                .updatedBy(adminUser())
                .build();

        timeline.onCreate();
        application.addTimeline(timeline);

        assertEquals(application, timeline.getJobApplication());
        assertEquals("Technical Interview", timeline.getStageLabel());
        assertEquals(TimelineStatus.UPCOMING, timeline.getStatus());
        assertEquals((short) 3, timeline.getDisplayOrder());
        assertNotNull(timeline.getUpdatedBy());
        assertNotNull(timeline.getCreatedAt());
        assertEquals(1, application.getTimeline().size());

        Set<ConstraintViolation<ApplicationTimeline>> violations = validator.validate(timeline);
        assertTrue(violations.isEmpty(), "ApplicationTimeline entity should have no constraint violations");
    }

    @Test
    @DisplayName("Notification is a broadcast; read state lives on NotificationRecipient")
    void testNotificationCreationAndMarkAsRead() {
        User student = User.builder()
                .id(3L)
                .email("student2@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.STUDENT)
                .build();

        Notification notification = Notification.builder()
                .title("Application Shortlisted")
                .message("Congratulations! You have been shortlisted for Cloud Engineer at Microsoft.")
                .notificationType(NotificationType.APPLICATION)
                .targetAudience(NotificationAudience.SPECIFIC_USERS)
                .createdBy(adminUser())
                .relatedJob(sampleJob())
                .build();

        notification.onCreate();

        assertEquals("Application Shortlisted", notification.getTitle());
        assertEquals(NotificationType.APPLICATION, notification.getNotificationType());
        assertEquals(NotificationPriority.NORMAL, notification.getPriority());
        assertEquals(NotificationStatus.DRAFT, notification.getStatus());
        assertEquals(NotificationAudience.SPECIFIC_USERS, notification.getTargetAudience());
        assertNotNull(notification.getCreatedBy());
        assertFalse(notification.getIsDeleted());
        assertNotNull(notification.getCreatedAt());

        Set<ConstraintViolation<Notification>> violations = validator.validate(notification);
        assertTrue(violations.isEmpty(), "Notification entity should have no constraint violations");

        NotificationRecipient delivery = NotificationRecipient.builder()
                .notification(notification)
                .user(student)
                .build();
        delivery.onCreate();
        notification.addRecipient(delivery);

        assertEquals(1, notification.getRecipients().size());
        assertFalse(delivery.getIsRead());
        assertNull(delivery.getReadAt());

        delivery.markAsRead();
        assertTrue(delivery.getIsRead());
        assertNotNull(delivery.getReadAt());

        Set<ConstraintViolation<NotificationRecipient>> deliveryViolations = validator.validate(delivery);
        assertTrue(deliveryViolations.isEmpty(), "NotificationRecipient should have no constraint violations");
    }

    @Test
    @DisplayName("Notification requires a target audience, matching the NOT NULL column")
    void testNotificationRequiresTargetAudience() {
        Notification notification = Notification.builder()
                .title("Campus drive next week")
                .message("Details to follow.")
                .createdBy(adminUser())
                .build();
        notification.onCreate();

        Set<ConstraintViolation<Notification>> violations = validator.validate(notification);
        assertEquals(1, violations.size());
        assertEquals("targetAudience", violations.iterator().next().getPropertyPath().toString());
    }
}
