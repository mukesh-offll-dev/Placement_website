package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.ApplicationTimeline;
import com.gces.placementcell.entity.enums.ApplicationStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * An application, as seen by the student who filed it and by the placement cell.
 *
 * The job is summarised rather than expanded so an application list does not pull every
 * job's child tables; reviewedBy is reduced to a {@link UserResponse}.
 */
public record JobApplicationResponse(
        Long id,
        JobSummaryResponse job,
        StudentSummaryResponse student,
        LocalDateTime appliedOn,
        String coverLetter,
        String resumeUrl,
        Boolean consentGiven,
        ApplicationStatus status,
        String currentStage,
        JobSelectionRoundResponse currentRound,
        UserResponse reviewedBy,
        String remarks,
        List<ApplicationTimelineResponse> timeline,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /** Without the timeline; matches what the paged application queries fetch. */
    public static JobApplicationResponse from(JobApplication application) {
        return build(application, List.of());
    }

    /**
     * With the timeline, for the application detail view. Pair with
     * {@code JobApplicationRepository.findWithTimelineById} so the stages are already
     * fetched rather than lazily loaded one query at a time.
     */
    public static JobApplicationResponse withTimeline(JobApplication application) {
        if (application == null) {
            return null;
        }
        List<ApplicationTimelineResponse> stages = application.getTimeline() == null ? List.of()
                : application.getTimeline().stream()
                        .sorted(java.util.Comparator.comparing(ApplicationTimeline::getDisplayOrder))
                        .map(ApplicationTimelineResponse::from)
                        .toList();
        return build(application, stages);
    }

    private static JobApplicationResponse build(
            JobApplication application, List<ApplicationTimelineResponse> timeline) {
        if (application == null) {
            return null;
        }
        return new JobApplicationResponse(
                application.getId(),
                JobSummaryResponse.from(application.getJob()),
                StudentSummaryResponse.from(application.getStudentProfile()),
                application.getAppliedOn(),
                application.getCoverLetter(),
                application.getResumeUrl(),
                application.getConsentGiven(),
                application.getStatus(),
                application.getCurrentStage(),
                JobSelectionRoundResponse.from(application.getCurrentRound()),
                UserResponse.from(application.getReviewedBy()),
                application.getRemarks(),
                timeline,
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }
}
