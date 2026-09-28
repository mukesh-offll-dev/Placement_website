package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.*;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Placement Cell Entity and Relationship Unit Tests")
class JobAndApplicationEntitiesTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    @Test
    @DisplayName("Should create and validate Job entity with default values, company relationship, and helpers")
    void testJobEntityCreationAndHelpers() {
        Company google = Company.builder()
                .id(1L)
                .name("Google")
                .industry("Technology")
                .build();

        Job job = Job.builder()
                .title("Software Development Engineer")
                .company(google)
                .description("Build scalable distributed systems.")
                .location("Bangalore")
                .salary("24 LPA")
                .employmentType(EmploymentType.FULL_TIME)
                .numberOfOpenings(10)
                .applicationDeadline(LocalDate.now().plusMonths(1))
                .status(JobStatus.ACTIVE)
                .build();

        job.onCreate();

        assertEquals("Software Development Engineer", job.getTitle());
        assertEquals("Software Development Engineer", job.getRole());
        assertEquals("Software Development Engineer", job.getJobRole());
        assertEquals(google, job.getCompany());
        assertEquals("Google", job.getCompanyName());
        assertEquals("24 LPA", job.getSalary());
        assertEquals("24 LPA", job.getPackage());
        assertEquals(10, job.getNumberOfOpenings());
        assertEquals(10, job.getVacancies());
        assertEquals(EmploymentType.FULL_TIME, job.getEmploymentType());
        assertEquals(JobStatus.ACTIVE, job.getStatus());
        assertFalse(job.getIsDeleted());
        assertNotNull(job.getCreatedAt());
        assertNotNull(job.getUpdatedAt());
        assertFalse(job.isExpired());
        assertTrue(job.isOpen());

        Set<ConstraintViolation<Job>> violations = validator.validate(job);
        assertTrue(violations.isEmpty(), "Job entity should have no constraint violations");
    }

    @Test
    @DisplayName("Should create and validate JobApplication entity with relationships and helpers")
    void testJobApplicationEntityCreationAndRelationships() {
        User user = User.builder()
                .id(1L)
                .email("student@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .build();

        StudentProfile profile = StudentProfile.builder()
                .id(10L)
                .user(user)
                .fullName("Alex Harrison")
                .email("student@gces.edu")
                .rollNo("220CSE001")
                .build();

        Company amazon = Company.builder()
                .id(2L)
                .name("Amazon")
                .build();

        Job job = Job.builder()
                .id(100L)
                .title("Data Analyst")
                .company(amazon)
                .applicationDeadline(LocalDate.now().plusWeeks(2))
                .build();

        JobApplication application = JobApplication.builder()
                .job(job)
                .studentProfile(profile)
                .status(ApplicationStatus.APPLIED)
                .coverLetter("Excited to apply for this opportunity.")
                .resumeUrl("https://storage.example.com/resumes/alex.pdf")
                .currentStage("Application Submitted")
                .build();

        application.onCreate();

        assertEquals(job, application.getJob());
        assertEquals(profile, application.getStudentProfile());
        assertEquals(profile, application.getStudent());
        assertEquals(profile, application.getApplicant());
        assertEquals(user, application.getApplicantUser());
        assertEquals(ApplicationStatus.APPLIED, application.getStatus());
        assertEquals("Application Submitted", application.getCurrentStage());
        assertNotNull(application.getAppliedAt());
        assertNotNull(application.getAppliedOn());
        assertNotNull(application.getCreatedAt());
        assertNotNull(application.getUpdatedAt());

        Set<ConstraintViolation<JobApplication>> violations = validator.validate(application);
        assertTrue(violations.isEmpty(), "JobApplication entity should have no constraint violations");
    }

    @Test
    @DisplayName("Should create and validate ApplicationTimeline with parent relationship")
    void testApplicationTimelineCreation() {
        User admin = User.builder()
                .id(2L)
                .email("admin@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.ADMIN)
                .build();

        JobApplication application = JobApplication.builder()
                .id(200L)
                .status(ApplicationStatus.UNDER_REVIEW)
                .build();

        ApplicationTimeline timeline = ApplicationTimeline.builder()
                .jobApplication(application)
                .stage("Technical Interview")
                .status(TimelineStatus.UPCOMING)
                .remarks("Scheduled for next Tuesday 10:00 AM")
                .displayOrder(3)
                .changedBy(admin)
                .build();

        timeline.onCreate();
        application.addTimeline(timeline);

        assertEquals(application, timeline.getJobApplication());
        assertEquals("Technical Interview", timeline.getStage());
        assertEquals("Technical Interview", timeline.getStageLabel());
        assertEquals(TimelineStatus.UPCOMING, timeline.getStatus());
        assertEquals("Scheduled for next Tuesday 10:00 AM", timeline.getRemarks());
        assertEquals("Scheduled for next Tuesday 10:00 AM", timeline.getComment());
        assertEquals(admin, timeline.getChangedBy());
        assertEquals((short) 3, (short) timeline.getDisplayOrder());
        assertNotNull(timeline.getChangedAt());
        assertEquals(1, application.getTimeline().size());

        Set<ConstraintViolation<ApplicationTimeline>> violations = validator.validate(timeline);
        assertTrue(violations.isEmpty(), "ApplicationTimeline entity should have no constraint violations");
    }

    @Test
    @DisplayName("Should create and validate Notification entity and mark as read")
    void testNotificationCreationAndMarkAsRead() {
        User student = User.builder()
                .id(3L)
                .email("student2@gces.edu")
                .passwordHash("hashed-pw")
                .role(UserRole.STUDENT)
                .build();

        Company msft = Company.builder().id(3L).name("Microsoft").build();
        Job job = Job.builder().id(300L).title("Cloud Engineer").company(msft).build();
        JobApplication application = JobApplication.builder().id(400L).build();

        Notification notification = Notification.builder()
                .recipient(student)
                .job(job)
                .jobApplication(application)
                .title("Application Shortlisted")
                .message("Congratulations! You have been shortlisted for Cloud Engineer at Microsoft.")
                .notificationType(NotificationType.APPLICATION)
                .build();

        notification.onCreate();

        assertEquals(student, notification.getRecipient());
        assertEquals(student, notification.getUser());
        assertEquals(job, notification.getJob());
        assertEquals(application, notification.getJobApplication());
        assertEquals(application, notification.getApplication());
        assertEquals("Application Shortlisted", notification.getTitle());
        assertEquals(NotificationType.APPLICATION, notification.getNotificationType());
        assertFalse(notification.getIsRead());
        assertNull(notification.getReadAt());
        assertNotNull(notification.getCreatedAt());

        notification.markAsRead();
        assertTrue(notification.getIsRead());
        assertNotNull(notification.getReadAt());

        Set<ConstraintViolation<Notification>> violations = validator.validate(notification);
        assertTrue(violations.isEmpty(), "Notification entity should have no constraint violations");
    }

    @Test
    @DisplayName("Should validate PlacementDrive, AdminProfile, and SavedJob entities")
    void testAdditionalEntities() {
        User adminUser = User.builder()
                .id(5L)
                .email("po@gces.edu")
                .passwordHash("hashed")
                .role(UserRole.PLACEMENT_OFFICER)
                .build();

        AdminProfile adminProfile = AdminProfile.builder()
                .user(adminUser)
                .name("Dr. S. Kumar")
                .designation("Placement Officer")
                .department("Training & Placement")
                .contactEmail("placement@gces.edu")
                .build();

        Set<ConstraintViolation<AdminProfile>> adminViolations = validator.validate(adminProfile);
        assertTrue(adminViolations.isEmpty(), "AdminProfile should have no constraint violations");

        Company comp = Company.builder().id(10L).name("TCS").build();
        Job job = Job.builder().id(50L).jobRole("System Engineer").company(comp).applicationDeadline(LocalDate.now().plusDays(10)).build();

        PlacementDrive drive = PlacementDrive.builder()
                .job(job)
                .driveDate(LocalDate.now().plusDays(5))
                .driveTime(LocalTime.of(10, 0))
                .venue("Auditorium A")
                .mode(DriveMode.OFFLINE)
                .status(DriveStatus.SCHEDULED)
                .build();

        Set<ConstraintViolation<PlacementDrive>> driveViolations = validator.validate(drive);
        assertTrue(driveViolations.isEmpty(), "PlacementDrive should have no constraint violations");

        StudentProfile student = StudentProfile.builder().id(20L).fullName("Jane Doe").email("jane@gces.edu").build();
        SavedJob savedJob = SavedJob.builder().studentProfile(student).job(job).build();

        Set<ConstraintViolation<SavedJob>> savedJobViolations = validator.validate(savedJob);
        assertTrue(savedJobViolations.isEmpty(), "SavedJob should have no constraint violations");
    }
}
