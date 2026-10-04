package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMediaResponse {
    private Long projectId;
    private String fileName;
    private String mediaUrl;
    private String downloadUrl;
    private String contentType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
}
