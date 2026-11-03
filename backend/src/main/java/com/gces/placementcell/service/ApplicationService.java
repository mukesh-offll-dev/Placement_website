package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.ApplicationStatusUpdateRequest;
import com.gces.placementcell.dto.request.ApplicationTimelineRequest;
import com.gces.placementcell.dto.request.JobApplicationRequest;
import com.gces.placementcell.dto.response.JobApplicationResponse;
import com.gces.placementcell.entity.ApplicationTimeline;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.JobSelectionRound;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.TimelineStatus;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.ApplicationTimelineRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.JobSelectionRoundRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

@Service
public class ApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final ApplicationTimelineRepository timelineRepository;
    private final JobRepository jobRepository;
    private final JobSelectionRoundRepository roundRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    /**
     * Whether students are also emailed by the backend about their own applications. Turn off
     * when the frontend sends those emails itself (EmailJS), so each event is mailed once.
     * The in-app notification is always created.
     */
    private final boolean emailStudentApplicationEvents;

    public ApplicationService(JobApplicationRepository applicationRepository,
                              ApplicationTimelineRepository timelineRepository,
                              JobRepository jobRepository,
                              JobSelectionRoundRepository roundRepository,
                              StudentProfileRepository studentProfileRepository,
                              UserRepository userRepository,
                              ApplicationEventPublisher eventPublisher,
                              @Value("${app.mail.student-application-emails:true}") boolean emailStudentApplicationEvents) {
        this.emailStudentApplicationEvents = emailStudentApplicationEvents;
        this.applicationRepository = applicationRepository;
        this.timelineRepository = timelineRepository;
        this.jobRepository = jobRepository;
        this.roundRepository = roundRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public JobApplicationResponse apply(String email, JobApplicationRequest request) {
        StudentProfile student = findStudent(email);
        Job job = jobRepository.findWithDetailsByIdAndIsDeletedFalse(request.jobId())
                .filter(Job::isOpen)
                .orElseThrow(() -> new ResourceNotFoundException("Open job", "id", request.jobId()));

        if (applicationRepository.existsByJobIdAndStudentProfileId(job.getId(), student.getId())) {
            throw new DuplicateResourceException("You have already applied to this job");
        }

        JobApplication application = JobApplication.builder()
                .job(job)
                .studentProfile(student)
                .coverLetter(request.coverLetter())
                .resumeUrl(request.resumeUrl() == null || request.resumeUrl().isBlank()
                        ? student.getResumeUrl()
                        : request.resumeUrl().trim())
                .consentGiven(true)
                .status(ApplicationStatus.APPLIED)
                .currentStage("Application Submitted")
                .build();
        application = applicationRepository.save(application);
        addTimeline(application, "Application Submitted", LocalDate.now(),
                TimelineStatus.DONE, null, null);
        applicationRepository.save(application);

        String studentName = displayName(student);
        String role = describeJob(job);
        notifyStudent(student, student.getUser(), "Application submitted: " + role,
                "Your application for " + role + " has been submitted. We'll notify you as it moves through the selection stages.");
        notifyAdmins(student.getUser(), "New application: " + studentName + " for " + role,
                studentName + " applied for " + role + ".", job.getId());

        return JobApplicationResponse.withTimeline(findApplicationWithTimeline(application.getId()));
    }

    @Transactional(readOnly = true)
    public Page<JobApplicationResponse> listMyApplications(String email, int page, int size) {
        StudentProfile student = findStudent(email);
        return applicationRepository.findByStudentProfileId(student.getId(), pageRequest(page, size))
                .map(JobApplicationResponse::from);
    }

    @Transactional(readOnly = true)
    public JobApplicationResponse getMyApplication(String email, Long applicationId) {
        StudentProfile student = findStudent(email);
        JobApplication application = findApplicationWithTimeline(applicationId);
        if (!application.getStudentProfile().getId().equals(student.getId())) {
            throw new ResourceNotFoundException("Application", "id", applicationId);
        }
        return JobApplicationResponse.withTimeline(application);
    }

    @Transactional
    public JobApplicationResponse withdraw(String email, Long applicationId) {
        StudentProfile student = findStudent(email);
        JobApplication application = findApplicationWithTimeline(applicationId);
        if (!application.getStudentProfile().getId().equals(student.getId())) {
            throw new ResourceNotFoundException("Application", "id", applicationId);
        }
        if (application.getStatus() == ApplicationStatus.SELECTED
                || application.getStatus() == ApplicationStatus.REJECTED
                || application.getStatus() == ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException("This application can no longer be withdrawn");
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);
        application.setCurrentStage("Application Withdrawn");
        addTimeline(application, application.getCurrentStage(), LocalDate.now(),
                TimelineStatus.DONE, null, null);
        JobApplication saved = applicationRepository.save(application);

        String role = describeJob(saved.getJob());
        notifyAdmins(student.getUser(), "Application withdrawn: " + displayName(student) + " for " + role,
                displayName(student) + " withdrew their application for " + role + ".",
                saved.getJob() == null ? null : saved.getJob().getId());
        return JobApplicationResponse.withTimeline(saved);
    }

    @Transactional(readOnly = true)
    public Page<JobApplicationResponse> listApplications(Long jobId, ApplicationStatus status, int page, int size) {
        if (jobId != null && !jobRepository.existsById(jobId)) {
            throw new ResourceNotFoundException("Job", "id", jobId);
        }
        return applicationRepository.findForAdmin(jobId, status, pageRequest(page, size))
                .map(JobApplicationResponse::from);
    }

    @Transactional(readOnly = true)
    public JobApplicationResponse getApplication(Long applicationId) {
        return JobApplicationResponse.withTimeline(findApplicationWithTimeline(applicationId));
    }

    @Transactional
    public JobApplicationResponse updateStatus(String adminEmail, Long applicationId,
                                               ApplicationStatusUpdateRequest request) {
        if (request.status() == ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException("Students must withdraw their own applications");
        }

        JobApplication application = findApplicationWithTimeline(applicationId);
        User reviewer = userRepository.findByEmailAndIsDeletedFalse(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", adminEmail));

        JobSelectionRound round = application.getCurrentRound();
        if (request.currentRoundId() != null) {
            round = roundRepository.findById(request.currentRoundId())
                    .filter(candidate -> candidate.getJob().getId().equals(application.getJob().getId()))
                    .orElseThrow(() -> new BadRequestException("Selection round does not belong to this job"));
        }

        String stage = request.currentStage() == null || request.currentStage().isBlank()
                ? formatStatus(request.status())
                : request.currentStage().trim();
        application.setStatus(request.status());
        application.setCurrentStage(stage);
        application.setCurrentRound(round);
        application.setReviewedBy(reviewer);
        application.setRemarks(request.remarks());
        addTimeline(application, stage, LocalDate.now(), TimelineStatus.DONE, request.remarks(), reviewer);

        // If the application is SELECTED, also update the student profile's placement details if not already placed
        if (request.status() == ApplicationStatus.SELECTED && application.getStudentProfile() != null) {
            StudentProfile profile = application.getStudentProfile();
            if (profile.getPlacementStatus() != PlacementStatus.PLACED) {
                profile.setPlacementStatus(PlacementStatus.PLACED);
                if (application.getJob() != null) {
                    profile.setPlacedCompany(application.getJob().getCompany());
                    profile.setPlacedCtc(application.getJob().getCtcValue());
                    profile.setPlacedOn(LocalDate.now());
                }
                studentProfileRepository.save(profile);
            }
        }

        JobApplication saved = applicationRepository.save(application);

        String role = describeJob(saved.getJob());
        StringBuilder message = new StringBuilder("Your application for ").append(role)
                .append(" is now: ").append(stage).append('.');
        if (request.remarks() != null && !request.remarks().isBlank()) {
            message.append("\nNote from the placement cell: ").append(request.remarks().trim());
        }
        notifyStudent(saved.getStudentProfile(), reviewer, "Application update: " + stage + " - " + role,
                message.toString());
        return JobApplicationResponse.withTimeline(saved);
    }

    @Transactional
    public JobApplicationResponse addInterviewStage(String adminEmail, Long applicationId,
                                                    ApplicationTimelineRequest request) {
        JobApplication application = findApplicationWithTimeline(applicationId);
        User reviewer = userRepository.findByEmailAndIsDeletedFalse(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", adminEmail));

        if (application.getStatus() == ApplicationStatus.WITHDRAWN
                || application.getStatus() == ApplicationStatus.REJECTED) {
            throw new BadRequestException("Interview stages cannot be added to a closed application");
        }

        String stage = request.stageLabel().trim();
        application.setCurrentStage(stage);
        addTimeline(application, stage, request.stageDate(), request.status(), request.remarks(), reviewer);
        JobApplication saved = applicationRepository.save(application);

        String role = describeJob(saved.getJob());
        StringBuilder message = new StringBuilder("A new stage was added to your application for ")
                .append(role).append(": ").append(stage);
        if (request.stageDate() != null) {
            message.append(" (").append(request.stageDate()).append(')');
        }
        message.append('.');
        if (request.remarks() != null && !request.remarks().isBlank()) {
            message.append("\nNote from the placement cell: ").append(request.remarks().trim());
        }
        notifyStudent(saved.getStudentProfile(), reviewer, "New stage: " + stage + " - " + role, message.toString());
        return JobApplicationResponse.withTimeline(saved);
    }

    /** In-app + email notice for the student who owns the application. */
    private void notifyStudent(StudentProfile student, User createdBy, String title, String message) {
        if (student == null || student.getUser() == null || createdBy == null) {
            return;
        }
        eventPublisher.publishEvent(new UserNotificationEvent(
                List.of(student.getUser().getId()), createdBy.getId(), title, message,
                NotificationType.APPLICATION, NotificationPriority.NORMAL, null, "/student/applications",
                emailStudentApplicationEvents));
    }

    /** In-app + email notice for every active admin and placement officer. */
    private void notifyAdmins(User createdBy, String title, String message, Long jobId) {
        if (createdBy == null) {
            return;
        }
        List<Long> adminIds = Stream.of(UserRole.ADMIN, UserRole.PLACEMENT_OFFICER)
                .flatMap(role -> userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(role).stream())
                .map(User::getId)
                .toList();
        if (adminIds.isEmpty()) {
            return;
        }
        eventPublisher.publishEvent(UserNotificationEvent.of(
                adminIds, createdBy.getId(), title, message, NotificationType.APPLICATION, jobId, "/admin/applications"));
    }

    private static String displayName(StudentProfile student) {
        return student.getFullName() == null || student.getFullName().isBlank()
                ? "A student" : student.getFullName().trim();
    }

    private static String describeJob(Job job) {
        if (job == null) {
            return "a job";
        }
        String company = job.getCompany() == null ? null : job.getCompany().getName();
        return company == null || company.isBlank() ? job.getJobRole() : job.getJobRole() + " at " + company;
    }

    private StudentProfile findStudent(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile", "user id", user.getId()));
    }

    private JobApplication findApplicationWithTimeline(Long applicationId) {
        return applicationRepository.findWithTimelineById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));
    }

    private void addTimeline(JobApplication application, String stage, LocalDate date,
                             TimelineStatus status, String remarks, User reviewer) {
        var timeline = timelineRepository.findByJobApplicationIdOrderByDisplayOrderAsc(application.getId());
        if (timeline.size() >= Short.MAX_VALUE) {
            throw new BadRequestException("The application has reached the maximum number of timeline stages");
        }
        ApplicationTimeline entry = ApplicationTimeline.builder()
                .jobApplication(application)
                .stageLabel(stage)
                .stageDate(date)
                .status(status)
                .displayOrder((short) (timeline.size() + 1))
                .remarks(remarks)
                .updatedBy(reviewer)
                .build();
        timelineRepository.save(entry);
        application.addTimeline(entry);
    }

    private String formatStatus(ApplicationStatus status) {
        return switch (status) {
            case UNDER_REVIEW -> "Under Review";
            case SHORTLISTED -> "Shortlisted";
            case INTERVIEW -> "Interview";
            case REJECTED -> "Rejected";
            case SELECTED -> "Selected";
            case WITHDRAWN -> "Withdrawn";
            case APPLIED -> "Application Submitted";
        };
    }

    private Pageable pageRequest(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "appliedOn"));
    }
}
