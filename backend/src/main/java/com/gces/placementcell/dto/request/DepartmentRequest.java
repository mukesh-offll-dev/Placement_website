package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** A new department. The code is fixed once created, so choose it carefully. */
public record DepartmentRequest(

        @NotBlank(message = "Department code is required")
        @Size(max = 10, message = "Department code cannot exceed 10 characters")
        @Pattern(regexp = "^[A-Za-z][A-Za-z0-9]{1,9}$",
                message = "Code must be 2 to 10 letters or digits and start with a letter")
        String code,

        @NotBlank(message = "Department name is required")
        @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
        String name
) {
}
