package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeResponse {
    private Long documentId;
    private Long studentId;
    private String fileName;
    private String resumeUrl;
    private String downloadUrl;
    private Long fileSize;
    private DocumentStatus status;
    private LocalDateTime uploadedAt;
}
