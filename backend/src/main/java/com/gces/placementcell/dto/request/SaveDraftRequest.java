package com.gces.placementcell.dto.request;

import com.gces.placementcell.dto.profile.ProfileData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** PUT /student/profile/draft. Sections left out of data keep their current draft (or official) value. */
public record SaveDraftRequest(
        @NotNull(message = "Profile data is required")
        @Valid
        ProfileData data,

        @Size(max = 1000, message = "Note cannot exceed 1000 characters")
        String studentNote
) {
}