package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Moves an application to a new status during shortlisting.
 *
 * Separate from {@link JobApplicationRequest} on purpose: the student owns the fields
 * in that DTO, the placement cell owns the ones here.
 */
public record ApplicationStatusUpdateRequest(

        @NotNull(message = "Status is required")
        ApplicationStatus status,

        @Size(max = 80, message = "Current stage cannot exceed 80 characters")
        String currentStage,

        Long currentRoundId,

        @Size(max = 255, message = "Remarks cannot exceed 255 characters")
        String remarks
) {
}
