package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotNull;

/** Preferences a student changes immediately, without verification. */
public record StudentPreferencesRequest(
        @NotNull(message = "isOpenToOpportunities is required")
        Boolean isOpenToOpportunities
) {
}