package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.PlacementDrive;
import com.gces.placementcell.entity.enums.DriveMode;
import com.gces.placementcell.entity.enums.DriveStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record PlacementDriveResponse(
        Long id,
        Long jobId,
        String jobRole,
        String companyName,
        LocalDate driveDate,
        LocalTime driveTime,
        String venue,
        DriveMode mode,
        DriveStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static PlacementDriveResponse from(PlacementDrive drive) {
        return new PlacementDriveResponse(
                drive.getId(),
                drive.getJob().getId(),
                drive.getJob().getJobRole(),
                drive.getJob().getCompany().getName(),
                drive.getDriveDate(),
                drive.getDriveTime(),
                drive.getVenue(),
                drive.getMode(),
                drive.getStatus(),
                drive.getCreatedAt(),
                drive.getUpdatedAt()
        );
    }
}