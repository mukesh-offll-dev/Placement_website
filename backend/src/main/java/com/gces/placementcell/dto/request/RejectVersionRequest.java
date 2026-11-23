package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

/** POST .../verifications/{id}/reject. A comment explaining what to fix is required. */
public record RejectVersionRequest(
        @NotBlank(message = "A comment is required when rejecting")
        @Size(max = 2000, message = "Comment cannot exceed 2000 characters")
        String comment,

        /** Optional {SECTION: comment}; keys must be section names. */
        Map<String, @Size(max = 1000, message = "Section comment cannot exceed 1000 characters") String> sectionComments
) {
}