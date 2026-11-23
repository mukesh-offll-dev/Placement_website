package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST /admin/students/archive-batch: archive a graduating batch (optionally one department). */
public record ArchiveBatchRequest(
        @NotBlank(message = "Batch is required")
        @Size(max = 20, message = "Batch cannot exceed 20 characters")
        String batch,

        @Size(max = 10, message = "Department code cannot exceed 10 characters")
        String departmentCode,

        @Size(max = 255, message = "Reason cannot exceed 255 characters")
        String reason
) {
}