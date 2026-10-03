package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.ResumeResponse;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.StudentResumeService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/students")
public class StudentResumeController {

    private final StudentResumeService resumeService;
    private final FileStorageService fileStorageService;

    public StudentResumeController(StudentResumeService resumeService, FileStorageService fileStorageService) {
        this.resumeService = resumeService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Upload or update resume for a student.
     */
    @PostMapping(value = "/{studentId}/resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ResumeResponse>> uploadResume(
            @PathVariable Long studentId,
            @RequestParam("file") MultipartFile file) {
        ResumeResponse response = resumeService.uploadResume(studentId, file);
        return ResponseEntity.ok(ApiResponse.success("Resume uploaded successfully", response));
    }

    /**
     * Get resume metadata for a student.
     */
    @GetMapping("/{studentId}/resume")
    public ResponseEntity<ApiResponse<ResumeResponse>> getResume(@PathVariable Long studentId) {
        ResumeResponse response = resumeService.getResume(studentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Download or view student resume file.
     * Use ?download=true for attachment download, ?download=false (default) for inline view.
     */
    @GetMapping("/{studentId}/resume/download")
    public ResponseEntity<Resource> downloadResume(
            @PathVariable Long studentId,
            @RequestParam(value = "download", defaultValue = "false") boolean download) {
        Resource resource = resumeService.downloadResume(studentId);
        String filename = resource.getFilename();
        String contentType = filename != null ? fileStorageService.getContentType(filename) : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String disposition = download ? "attachment" : "inline";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                .body(resource);
    }


    /**
     * Delete student resume.
     */
    @DeleteMapping("/{studentId}/resume")
    public ResponseEntity<ApiResponse<Void>> deleteResume(@PathVariable Long studentId) {
        resumeService.deleteResume(studentId);
        return ResponseEntity.ok(ApiResponse.success("Resume deleted successfully"));
    }
}
