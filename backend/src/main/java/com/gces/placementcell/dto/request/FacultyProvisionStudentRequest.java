package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /faculty/students/provision. Same as the admin request; any department sent is ignored (forced to the advisor's). */
public record FacultyProvisionStudentRequest(
        @NotBlank(message = "Register number is required")
        @Size(max = 20, message = "Register number cannot exceed 20 characters")
        String registerNumber,

        @Size(max = 100, message = "Department cannot exceed 100 characters")
        String department,

        @NotNull(message = "Year is required")
        @Min(value = 2000, message = "Year must be between 2000 and 2100")
        @Max(value = 2100, message = "Year must be between 2000 and 2100")
        Integer year
) {
}