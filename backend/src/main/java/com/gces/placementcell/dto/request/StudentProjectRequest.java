package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A portfolio project entry on a student's profile. */
public record StudentProjectRequest(

        @NotBlank(message = "Project title is required")
        @Size(max = 150, message = "Project title cannot exceed 150 characters")
        String title,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @Size(max = 1000, message = "Live URL cannot exceed 1000 characters")
        String liveUrl,

        @Size(max = 1000, message = "Repository URL cannot exceed 1000 characters")
        String repoUrl,

        @Size(max = 1000, message = "Media URL cannot exceed 1000 characters")
        String mediaUrl
) {
}
