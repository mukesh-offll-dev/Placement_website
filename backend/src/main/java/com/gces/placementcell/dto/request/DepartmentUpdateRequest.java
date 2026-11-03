package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Size;

/** Rename a department or switch it on or off. Either field may be left out. */
public record DepartmentUpdateRequest(

        @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
        String name,

        Boolean isActive
) {
}
