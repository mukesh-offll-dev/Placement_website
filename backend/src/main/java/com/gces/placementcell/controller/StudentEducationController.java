package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.service.StudentEducationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated student education history management.
 * Path: /api/student/education
 * Requires: ROLE_STUDENT (enforced by SecurityConfig /student/**)
 */
@RestController
@RequestMapping("/student/education")
@RequiredArgsConstructor
public class StudentEducationController {

    private final StudentEducationService studentEducationService;

    /**
     * POST /api/student/education
     * Creates a new education record for the authenticated student.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentEducationResponse>> createEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse response = studentEducationService.createEducation(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Education record created successfully", response));
    }

    /**
     * GET /api/student/education
     * Retrieves all education records belonging to the authenticated student.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentEducationResponse>>> getAllEducation(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentEducationResponse> response = studentEducationService.getAllEducation(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/student/education/{educationId}
     * Retrieves a specific education record belonging to the authenticated student.
     */
    @GetMapping("/{educationId}")
    public ResponseEntity<ApiResponse<StudentEducationResponse>> getEducationById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId) {
        StudentEducationResponse response = studentEducationService.getEducationById(userDetails.getUsername(), educationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * PUT /api/student/education/{educationId}
     * Updates an existing education record belonging to the authenticated student.
     */
    @PutMapping("/{educationId}")
    public ResponseEntity<ApiResponse<StudentEducationResponse>> updateEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse response = studentEducationService.updateEducation(userDetails.getUsername(), educationId, request);
        return ResponseEntity.ok(ApiResponse.success("Education record updated successfully", response));
    }

    /**
     * DELETE /api/student/education/{educationId}
     * Deletes an education record belonging to the authenticated student.
     */
    @DeleteMapping("/{educationId}")
    public ResponseEntity<ApiResponse<Void>> deleteEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId) {
        studentEducationService.deleteEducation(userDetails.getUsername(), educationId);
        return ResponseEntity.ok(ApiResponse.success("Education record deleted successfully"));
    }
}

