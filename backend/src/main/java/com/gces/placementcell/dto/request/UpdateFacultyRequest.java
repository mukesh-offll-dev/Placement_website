package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** PUT /admin/faculty/{id}. departmentId null unassigns the advisor. */
public record UpdateFacultyRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name cannot exceed 150 characters")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @Pattern(regexp = "^$|^[+0-9][0-9 ()-]{6,19}$", message = "Phone number format is invalid")
        @Size(max = 20, message = "Phone cannot exceed 20 characters")
        String phone,

        @Size(max = 100, message = "Designation cannot exceed 100 characters")
        String designation,

        Long departmentId,

        Boolean replaceExisting
) {
}