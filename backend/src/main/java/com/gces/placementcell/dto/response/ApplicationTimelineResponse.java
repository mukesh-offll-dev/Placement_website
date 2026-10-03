package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.ApplicationTimeline;
import com.gces.placementcell.entity.enums.TimelineStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** One stage in an application's progress, shown as a timeline entry. */
public record ApplicationTimelineResponse(
        Long id,
        String stageLabel,
        LocalDate stageDate,
        TimelineStatus status,
        Short displayOrder,
        String remarks,
        LocalDateTime createdAt
) {

    /**
     * updatedBy is deliberately omitted: which officer moved a stage is internal audit
     * information and this DTO is served to the applying student.
     */
    public static ApplicationTimelineResponse from(ApplicationTimeline timeline) {
        if (timeline == null) {
            return null;
        }
        return new ApplicationTimelineResponse(
                timeline.getId(),
                timeline.getStageLabel(),
                timeline.getStageDate(),
                timeline.getStatus(),
                timeline.getDisplayOrder(),
                timeline.getRemarks(),
                timeline.getCreatedAt()
        );
    }
}
