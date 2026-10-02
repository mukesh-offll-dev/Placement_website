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
public class FileUploadResponse {
    private String fileName;
    private String originalFileName;
    private String fileUrl;
    private String downloadUrl;
    private String contentType;
    private long size;
    private LocalDateTime uploadedAt;
}
