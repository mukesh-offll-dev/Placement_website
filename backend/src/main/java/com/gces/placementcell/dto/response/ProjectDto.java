package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDto {
    private Long id;
    private String title;
    private String description;
    private String liveUrl;
    private String repoUrl;
    private String mediaUrl;
    private List<String> techStack;
}
