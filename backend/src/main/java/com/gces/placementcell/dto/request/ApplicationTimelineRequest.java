package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.TimelineStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** One stage appended to an application's timeline, e.g. "Technical Round 1". */
public record ApplicationTimelineRequest(

        @NotBlank(message = "Stage label is required")
        @Size(max = 80, message = "Stage label cannot exceed 80 characters")
        String stageLabel,

        LocalDate stageDate,

        @NotNull(message = "Stage status is required")
        TimelineStatus status,

        @Size(max = 255, message = "Remarks cannot exceed 255 characters")
        String remarks
) {
}
