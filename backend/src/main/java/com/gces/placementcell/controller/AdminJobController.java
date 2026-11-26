package com.gces.placementcell.controller;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.dto.request.PlacementDriveRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.JobStatsResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.dto.response.PlacementDriveResponse;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.JobService;
import com.gces.placementcell.service.PlacementDriveService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/admin")
public class AdminJobController {

    private static final Set<String> ALLOWED_LOGO_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/jpg", "image/webp"
    );

    private final JobService jobService;
    private final PlacementDriveService driveService;
    private final FileStorageService fileStorageService;
    private final FileStorageProperties fileStorageProperties;

    public AdminJobController(JobService jobService,
                              PlacementDriveService driveService,
                              FileStorageService fileStorageService,
                              FileStorageProperties fileStorageProperties) {
        this.jobService = jobService;
        this.driveService = driveService;
        this.fileStorageService = fileStorageService;
        this.fileStorageProperties = fileStorageProperties;
    }

    @PostMapping(value = "/jobs/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadCompanyLogo(
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Logo file is required");
        }
        if (file.getSize() > fileStorageProperties.getMaxLogoSize()) {
            throw new BadRequestException("Logo file size must not exceed 2 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_LOGO_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Unsupported file type. Only PNG, JPG, JPEG, and WebP images are allowed");
        }
        if (!hasValidImageSignature(file)) {
            throw new BadRequestException("Invalid image file content. Only PNG, JPG, JPEG, and WebP images are allowed");
        }

        String storedFileName = fileStorageService.storeFile(
                file,
                fileStorageProperties.getLogoSubdir(),
                fileStorageProperties.getAllowedLogoExtensions(),
                fileStorageProperties.getMaxLogoSize()
        );
        String logoUrl = "/api/files/view/" + fileStorageProperties.getLogoSubdir() + "/" + storedFileName;

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Company logo uploaded successfully", Map.of(
                        "logoUrl", logoUrl,
                        "fileName", storedFileName
                )));
    }

    private boolean hasValidImageSignature(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                return false;
            }
            // PNG: 89 50 4E 47
            boolean isPng = (header[0] & 0xFF) == 0x89 && header[1] == 0x50
                    && header[2] == 0x4E && header[3] == 0x47;
            // JPEG: FF D8 FF
            boolean isJpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8
                    && (header[2] & 0xFF) == 0xFF;
            // WebP: RIFF....WEBP
            boolean isWebp = bytesRead >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            return isPng || isJpeg || isWebp;
        } catch (IOException e) {
            return false;
        }
    }

    @GetMapping("/jobs/stats")
    public ResponseEntity<ApiResponse<JobStatsResponse>> getJobStats() {
        return ResponseEntity.ok(ApiResponse.success(jobService.getJobStats()));
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<Page<JobSummaryResponse>>> listJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(jobService.listAdminJobs(page, size)));
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getAdminJob(id)));
    }

    @PostMapping("/jobs")
    public ResponseEntity<ApiResponse<JobResponse>> createJob(
            @Valid @RequestBody JobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        JobResponse response = jobService.createJob(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Job created successfully", response));
    }

    @PutMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Job updated successfully", jobService.updateJob(id, request)));
    }

    @PatchMapping("/jobs/{id}/close")
    public ResponseEntity<ApiResponse<JobResponse>> closeJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Job closed successfully", jobService.closeJob(id)));
    }

    @PatchMapping("/jobs/{id}/reopen")
    public ResponseEntity<ApiResponse<JobResponse>> reopenJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Job reopened successfully", jobService.reopenJob(id)));
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.ok(ApiResponse.success("Job archived successfully"));
    }

    @GetMapping("/drives")
    public ResponseEntity<ApiResponse<List<PlacementDriveResponse>>> listDrives(
            @RequestParam(required = false) Long jobId) {
        return ResponseEntity.ok(ApiResponse.success(driveService.listDrives(jobId)));
    }

    @GetMapping("/drives/{id}")
    public ResponseEntity<ApiResponse<PlacementDriveResponse>> getDrive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(driveService.getDrive(id)));
    }

    @PostMapping("/drives")
    public ResponseEntity<ApiResponse<PlacementDriveResponse>> createDrive(
            @Valid @RequestBody PlacementDriveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Placement drive created successfully", driveService.createDrive(request)));
    }

    @PutMapping("/drives/{id}")
    public ResponseEntity<ApiResponse<PlacementDriveResponse>> updateDrive(
            @PathVariable Long id,
            @Valid @RequestBody PlacementDriveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Placement drive updated successfully", driveService.updateDrive(id, request)));
    }

    @DeleteMapping("/drives/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDrive(@PathVariable Long id) {
        driveService.deleteDrive(id);
        return ResponseEntity.ok(ApiResponse.success("Placement drive deleted successfully"));
    }
}
