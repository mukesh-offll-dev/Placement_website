package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.DriveMode;
import com.gces.placementcell.entity.enums.DriveStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record PlacementDriveRequest(
        @NotNull(message = "Job is required")
        Long jobId,

        @NotNull(message = "Drive date is required")
        LocalDate driveDate,

        LocalTime driveTime,

        @Size(max = 150, message = "Venue cannot exceed 150 characters")
        String venue,

        @NotNull(message = "Drive mode is required")
        DriveMode mode,

        DriveStatus status
) {
}