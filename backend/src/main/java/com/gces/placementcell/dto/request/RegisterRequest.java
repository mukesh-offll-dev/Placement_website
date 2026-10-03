package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Creates a login row and, for students, the matching profile shell.
 *
 * Size limits mirror the column widths in schema.sql so an over-long value is
 * rejected with a field-level message instead of a database error.
 */
public record RegisterRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "Password must contain an uppercase letter, a lowercase letter and a digit"
        )
        String password,

        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name cannot exceed 120 characters")
        String fullName,

        /** Required for students, ignored for staff accounts. */
        @Size(max = 20, message = "Roll number cannot exceed 20 characters")
        String rollNo,

        @NotNull(message = "Role is required")
        UserRole role
) {
}
