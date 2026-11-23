package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Size;

/** POST .../verifications/{id}/approve. */
public record ApproveVersionRequest(
        @Size(max = 2000, message = "Comment cannot exceed 2000 characters")
        String comment
) {
}