package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Adds one student. The placement cell supplies only who the student is and where they study;
 * the student sets their own name, email and password at first login.
 *
 * @param year graduation year of the batch, e.g. 2026 for the 2022-2026 batch
 */
public record ProvisionStudentRequest(

        @NotBlank(message = "Register number is required")
        @Size(max = 20, message = "Register number cannot exceed 20 characters")
        String registerNumber,

        @NotBlank(message = "Department is required")
        @Size(max = 100, message = "Department cannot exceed 100 characters")
        String department,

        @NotNull(message = "Year is required")
        @Min(value = 2000, message = "Year must be between 2000 and 2100")
        @Max(value = 2100, message = "Year must be between 2000 and 2100")
        Integer year
) {
}
