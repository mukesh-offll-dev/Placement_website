package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.FileUploadResponse;
import com.gces.placementcell.dto.response.ProjectMediaResponse;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.ProjectMediaService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/projects")
public class ProjectMediaController {

    private final ProjectMediaService projectMediaService;
    private final FileStorageService fileStorageService;

    public ProjectMediaController(ProjectMediaService projectMediaService, FileStorageService fileStorageService) {
        this.projectMediaService = projectMediaService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Standalone upload of media file before or during project creation.
     */
    @PostMapping(value = "/media/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadMediaStandalone(
            @RequestParam("file") MultipartFile file) {
        FileUploadResponse response = projectMediaService.uploadMediaStandalone(file);
        return ResponseEntity.ok(ApiResponse.success("Project media uploaded successfully", response));
    }

    /**
     * Upload media and attach to an existing project.
     */
    @PostMapping(value = "/{projectId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProjectMediaResponse>> uploadProjectMedia(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file) {
        ProjectMediaResponse response = projectMediaService.uploadProjectMedia(projectId, file);
        return ResponseEntity.ok(ApiResponse.success("Project media attached successfully", response));
    }

    /**
     * Retrieve project media metadata.
     */
    @GetMapping("/{projectId}/media")
    public ResponseEntity<ApiResponse<ProjectMediaResponse>> getProjectMedia(@PathVariable Long projectId) {
        ProjectMediaResponse response = projectMediaService.getProjectMedia(projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Download or view project media file.
     */
    @GetMapping("/{projectId}/media/download")
    public ResponseEntity<Resource> downloadProjectMedia(@PathVariable Long projectId) {
        Resource resource = projectMediaService.downloadProjectMedia(projectId);
        String filename = resource.getFilename();
        String contentType = filename != null ? fileStorageService.getContentType(filename) : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * Delete media attached to a project.
     */
    @DeleteMapping("/{projectId}/media")
    public ResponseEntity<ApiResponse<Void>> deleteProjectMedia(@PathVariable Long projectId) {
        projectMediaService.deleteProjectMedia(projectId);
        return ResponseEntity.ok(ApiResponse.success("Project media deleted successfully"));
    }
}
