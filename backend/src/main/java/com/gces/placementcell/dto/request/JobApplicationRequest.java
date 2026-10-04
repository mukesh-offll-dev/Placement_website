package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A student's application to a job.
 *
 * The applying student is resolved from the authenticated principal, not from the
 * payload, so one student cannot apply on another's behalf.
 */
public record JobApplicationRequest(

        @NotNull(message = "Job is required")
        Long jobId,

        @Size(max = 4000, message = "Cover letter cannot exceed 4000 characters")
        String coverLetter,

        @Size(max = 1000, message = "Resume URL cannot exceed 1000 characters")
        String resumeUrl,

        @NotNull(message = "Consent is required")
        Boolean consentGiven
) {

    /**
     * The consent column exists so the cell can show a student agreed to share their
     * profile with the recruiter. An application without it has no legal standing, so
     * reject it here rather than storing consent_given = false.
     */
    @AssertTrue(message = "You must consent to sharing your profile with the recruiter")
    public boolean isConsentAccepted() {
        return Boolean.TRUE.equals(consentGiven);
    }
}
