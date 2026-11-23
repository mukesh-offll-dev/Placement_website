package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** POST /admin/faculty. Email is generated when left out; departmentId may be null (unassigned). */
public record CreateFacultyRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name cannot exceed 150 characters")
        String fullName,

        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @Pattern(regexp = "^$|^[+0-9][0-9 ()-]{6,19}$", message = "Phone number format is invalid")
        @Size(max = 20, message = "Phone cannot exceed 20 characters")
        String phone,

        @Size(max = 100, message = "Designation cannot exceed 100 characters")
        String designation,

        Long departmentId,

        /** Assign even if the department already has an active advisor (that advisor is unassigned). */
        Boolean replaceExisting
) {
}