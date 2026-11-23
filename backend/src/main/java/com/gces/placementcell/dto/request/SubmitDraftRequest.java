package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Size;

/** POST /student/profile/draft/submit. */
public record SubmitDraftRequest(
        @Size(max = 1000, message = "Note cannot exceed 1000 characters")
        String studentNote
) {
}