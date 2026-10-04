package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.ApplicationTimelineRequest;
import com.gces.placementcell.dto.request.JobApplicationRequest;
import com.gces.placementcell.entity.ApplicationTimeline;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.TimelineStatus;
import com.gces.placementcell.repository.ApplicationTimelineRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.JobSelectionRoundRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock private JobApplicationRepository applicationRepository;
    @Mock private ApplicationTimelineRepository timelineRepository;
    @Mock private JobRepository jobRepository;
    @Mock private JobSelectionRoundRepository roundRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private UserRepository userRepository;

    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(
                applicationRepository,
                timelineRepository,
                jobRepository,
                roundRepository,
                studentProfileRepository,
                userRepository);
    }

    @Test
    void applyCreatesApplicationAndInitialTimeline() {
        User studentUser = User.builder().id(3L).email("student@example.com").build();
        StudentProfile student = StudentProfile.builder()
                .id(5L)
                .user(studentUser)
                .fullName("Student Example")
                .email("student@example.com")
                .resumeUrl("https://example.com/profile-resume.pdf")
                .build();
        Job job = openJob();
        AtomicReference<JobApplication> savedApplication = new AtomicReference<>();

        when(userRepository.findByEmailAndIsDeletedFalse(studentUser.getEmail()))
                .thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(studentUser.getId())).thenReturn(Optional.of(student));
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(job.getId())).thenReturn(Optional.of(job));
        when(applicationRepository.existsByJobIdAndStudentProfileId(job.getId(), student.getId())).thenReturn(false);
        when(applicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> {
            JobApplication application = invocation.getArgument(0);
            application.setId(12L);
            savedApplication.set(application);
            return application;
        });
        when(applicationRepository.findWithTimelineById(12L))
                .thenAnswer(invocation -> Optional.of(savedApplication.get()));
        when(timelineRepository.findByJobApplicationIdOrderByDisplayOrderAsc(12L)).thenReturn(List.of());
        when(timelineRepository.save(any(ApplicationTimeline.class))).thenAnswer(invocation -> {
            ApplicationTimeline timeline = invocation.getArgument(0);
            timeline.setId(20L);
            return timeline;
        });

        var response = applicationService.apply(studentUser.getEmail(),
                new JobApplicationRequest(job.getId(), "Interested in this role", null, true));

        assertEquals(ApplicationStatus.APPLIED, response.status());
        assertEquals("https://example.com/profile-resume.pdf", response.resumeUrl());
        assertEquals(1, response.timeline().size());
        assertEquals("Application Submitted", response.timeline().get(0).stageLabel());
        verify(applicationRepository).existsByJobIdAndStudentProfileId(job.getId(), student.getId());
    }

    @Test
    void interviewStageIsAppendedInDisplayOrderAndUpdatesCurrentStage() {
        User admin = User.builder().id(9L).email("admin@example.com").build();
        User studentUser = User.builder().id(3L).email("student@example.com").build();
        StudentProfile student = StudentProfile.builder()
                .id(5L).user(studentUser).fullName("Student Example").email(studentUser.getEmail()).build();
        JobApplication application = JobApplication.builder()
                .id(12L).job(openJob()).studentProfile(student)
                .status(ApplicationStatus.SHORTLISTED).currentStage("Shortlisted").build();
        ApplicationTimeline submitted = ApplicationTimeline.builder()
                .stageLabel("Application Submitted")
                .status(TimelineStatus.DONE)
                .displayOrder((short) 1)
                .build();
        application.addTimeline(submitted);

        when(applicationRepository.findWithTimelineById(application.getId())).thenReturn(Optional.of(application));
        when(userRepository.findByEmailAndIsDeletedFalse(admin.getEmail())).thenReturn(Optional.of(admin));
        when(timelineRepository.findByJobApplicationIdOrderByDisplayOrderAsc(application.getId()))
                .thenReturn(List.of(submitted));
        when(timelineRepository.save(any(ApplicationTimeline.class))).thenAnswer(invocation -> {
            ApplicationTimeline timeline = invocation.getArgument(0);
            timeline.setId(21L);
            return timeline;
        });
        when(applicationRepository.save(application)).thenReturn(application);

        var response = applicationService.addInterviewStage(admin.getEmail(), application.getId(),
                new ApplicationTimelineRequest(
                        "Technical Interview", LocalDate.now().plusDays(2), TimelineStatus.UPCOMING, "Online"));

        assertEquals("Technical Interview", response.currentStage());
        assertEquals(2, response.timeline().size());
        assertEquals((short) 2, response.timeline().get(1).displayOrder());
        assertEquals(TimelineStatus.UPCOMING, response.timeline().get(1).status());
        assertEquals(ApplicationStatus.SHORTLISTED, response.status());
    }

    private Job openJob() {
        return Job.builder()
                .id(7L)
                .jobRole("Software Engineer")
                .status(JobStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .applicationDeadline(LocalDate.now().plusDays(10))
                .build();
    }
}
