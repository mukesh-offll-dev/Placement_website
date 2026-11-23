package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.BulkStudentAction;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** POST /admin/students/bulk and /faculty/students/bulk. */
public record BulkStudentActionRequest(
        @NotEmpty(message = "Select at least one student")
        @Size(max = 1000, message = "At most 1000 students per request")
        List<@NotNull(message = "Student id cannot be null") Long> studentIds,

        @NotNull(message = "Action is required")
        BulkStudentAction action,

        @Size(max = 255, message = "Reason cannot exceed 255 characters")
        String reason
) {
}