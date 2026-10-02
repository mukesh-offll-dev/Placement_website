package com.gces.placementcell.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "file")
@Getter
@Setter
public class FileStorageProperties {

    /**
     * Base directory where uploaded files are stored.
     */
    private String uploadDir = "./uploads";

    /**
     * Subdirectory for resumes.
     */
    private String resumeSubdir = "resumes";

    /**
     * Subdirectory for project media.
     */
    private String projectMediaSubdir = "projects";

    /**
     * Max resume file size in bytes (default: 10MB).
     */
    private long maxResumeSize = 10 * 1024 * 1024;

    /**
     * Max project media file size in bytes (default: 10MB).
     */
    private long maxMediaSize = 10 * 1024 * 1024;

    /**
     * Allowed extensions for resumes.
     */
    private List<String> allowedResumeExtensions = List.of("pdf", "doc", "docx");

    /**
     * Allowed extensions for project media.
     */
    private List<String> allowedMediaExtensions = List.of("jpg", "jpeg", "png", "webp", "pdf");
}
