package com.gces.placementcell.controller;

import com.gces.placementcell.service.FileAccessPolicy;
import com.gces.placementcell.service.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/files")
public class FileDownloadController {

    private final FileStorageService fileStorageService;
    private final FileAccessPolicy fileAccessPolicy;

    public FileDownloadController(FileStorageService fileStorageService, FileAccessPolicy fileAccessPolicy) {
        this.fileStorageService = fileStorageService;
        this.fileAccessPolicy = fileAccessPolicy;
    }

    /**
     * Download a file by category (e.g. resumes, projects) and filename.
     */
    @GetMapping("/download/{category}/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String category,
            @PathVariable String fileName,
            @AuthenticationPrincipal UserDetails userDetails) {
        fileAccessPolicy.verifyCanRead(userDetails, category, fileName);
        Resource resource = fileStorageService.loadFileAsResource(category, fileName);
        String contentType = fileStorageService.getContentType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }

    /**
     * View/stream a file inline (for images, pdfs in browser).
     */
    @GetMapping("/view/{category}/{fileName:.+}")
    public ResponseEntity<Resource> viewFile(
            @PathVariable String category,
            @PathVariable String fileName,
            @AuthenticationPrincipal UserDetails userDetails) {
        fileAccessPolicy.verifyCanRead(userDetails, category, fileName);
        Resource resource = fileStorageService.loadFileAsResource(category, fileName);
        String contentType = fileStorageService.getContentType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(resource);
    }
}
