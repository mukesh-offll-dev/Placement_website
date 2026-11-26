package com.gces.placementcell.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Size;

/**
 * Request payload for appending an admin timeline note to an application.
 */
public record ApplicationTimelineNoteRequest(

        @JsonAlias({"remarks", "content", "message", "text"})
        @Size(max = 255, message = "Note cannot exceed 255 characters")
        String note,

        @JsonAlias({"stage", "title", "label"})
        @Size(max = 80, message = "Stage label cannot exceed 80 characters")
        String stageLabel
) {
    public String getEffectiveNote() {
        if (note != null && !note.isBlank()) {
            return note.trim();
        }
        return "";
    }

    public String getEffectiveStageLabel() {
        if (stageLabel != null && !stageLabel.isBlank()) {
            return stageLabel.trim();
        }
        return "Admin Note";
    }
}
