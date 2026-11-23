package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A new department. The code is fixed once created, so choose it carefully. Optionally creates the
 * department's faculty advisor account in the same step.
 */
public record DepartmentRequest(

        @NotBlank(message = "Department code is required")
        @Size(max = 10, message = "Department code cannot exceed 10 characters")
        @Pattern(regexp = "^[A-Za-z][A-Za-z0-9]{1,9}$",
                message = "Code must be 2 to 10 letters or digits and start with a letter")
        String code,

        @NotBlank(message = "Department name is required")
        @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
        String name,

        Boolean createFacultyAccount,

        @Size(max = 150, message = "Faculty name cannot exceed 150 characters")
        String facultyName,

        @Email(message = "Faculty email must be a valid address")
        @Size(max = 150, message = "Faculty email cannot exceed 150 characters")
        String facultyEmail
) {

    public DepartmentRequest(String code, String name) {
        this(code, name, null, null, null);
    }
}
