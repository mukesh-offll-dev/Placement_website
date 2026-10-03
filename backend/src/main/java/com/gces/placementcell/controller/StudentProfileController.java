package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authenticated student profile operations.
 * Path: /api/student/profile
 * Requires: ROLE_STUDENT (enforced by SecurityConfig /student/**)
 */
@RestController
@RequestMapping("/student/profile")
public class StudentProfileController {

    private final StudentProfileService studentProfileService;

    public StudentProfileController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/profile
     * Returns the authenticated student's full profile.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        StudentProfileResponse response = studentProfileService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * POST /api/student/profile
     * Creates a profile for the authenticated student if not already present.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> createProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.createProfile(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Profile created successfully", response));
    }

    /**
     * PUT /api/student/profile
     * Updates the authenticated student's profile.
     */
    @PutMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", response));
    }
}
