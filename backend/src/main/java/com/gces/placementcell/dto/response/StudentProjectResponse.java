package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.ProjectTechStack;
import com.gces.placementcell.entity.StudentProject;

import java.time.LocalDateTime;
import java.util.List;

/** A portfolio project on a student's profile, with its tech stack flattened to names. */
public record StudentProjectResponse(
        Long id,
        String title,
        String description,
        String liveUrl,
        String repoUrl,
        String mediaUrl,
        List<String> techStack,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /**
     * Reads the lazy techStack bag, so call this inside the transaction that loaded the
     * project (or from a query that fetched the collection).
     */
    public static StudentProjectResponse from(StudentProject project) {
        if (project == null) {
            return null;
        }
        List<String> stack = project.getTechStack() == null ? List.of()
                : project.getTechStack().stream().map(ProjectTechStack::getTechnology).toList();
        return new StudentProjectResponse(
                project.getId(),
                project.getTitle(),
                project.getDescription(),
                project.getLiveUrl(),
                project.getRepoUrl(),
                project.getMediaUrl(),
                stack,
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
