package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.JobApplicationRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.JobApplicationResponse;
import com.gces.placementcell.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student/applications")
public class StudentApplicationController {

    private final ApplicationService applicationService;

    public StudentApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JobApplicationResponse>> apply(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody JobApplicationRequest request) {
        JobApplicationResponse response = applicationService.apply(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application submitted successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobApplicationResponse>>> listMyApplications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                applicationService.listMyApplications(userDetails.getUsername(), page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobApplicationResponse>> getMyApplication(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                applicationService.getMyApplication(userDetails.getUsername(), id)));
    }

    @PatchMapping("/{id}/withdraw")
    public ResponseEntity<ApiResponse<JobApplicationResponse>> withdraw(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Application withdrawn successfully",
                applicationService.withdraw(userDetails.getUsername(), id)));
    }
}
