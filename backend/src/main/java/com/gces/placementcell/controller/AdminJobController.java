package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.dto.request.PlacementDriveRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.dto.response.PlacementDriveResponse;
import com.gces.placementcell.service.JobService;
import com.gces.placementcell.service.PlacementDriveService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminJobController {

    private final JobService jobService;
    private final PlacementDriveService driveService;

    public AdminJobController(JobService jobService, PlacementDriveService driveService) {
        this.jobService = jobService;
        this.driveService = driveService;
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