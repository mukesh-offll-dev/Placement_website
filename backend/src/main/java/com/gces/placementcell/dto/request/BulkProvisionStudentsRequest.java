package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Adds every student in a register number range (from and to inclusive). Register numbers that
 * already exist are skipped rather than failing the request.
 */
public record BulkProvisionStudentsRequest(

        @NotBlank(message = "'From' register number is required")
        @Size(max = 20, message = "Register number cannot exceed 20 characters")
        String registerNumberFrom,

        @NotBlank(message = "'To' register number is required")
        @Size(max = 20, message = "Register number cannot exceed 20 characters")
        String registerNumberTo,

        @NotBlank(message = "Department is required")
        @Size(max = 100, message = "Department cannot exceed 100 characters")
        String department,

        @NotNull(message = "Year is required")
        @Min(value = 2000, message = "Year must be between 2000 and 2100")
        @Max(value = 2100, message = "Year must be between 2000 and 2100")
        Integer year
) {
}
