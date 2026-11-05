package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated student education records.
 * Path: /api/student/education
 * Requires: ROLE_STUDENT
 */
@RestController
@RequestMapping("/student/education")
public class StudentEducationController {

    private final StudentProfileService studentProfileService;

    public StudentEducationController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/education
     * Retrieves all education entries of the authenticated student.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentEducationResponse>>> getEducation(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentEducationResponse> education = studentProfileService.getEducation(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(education));
    }

    /**
     * POST /api/student/education
     * Adds an education entry to the authenticated student's profile.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentEducationResponse>> addEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse education = studentProfileService.addEducation(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Education record added successfully", education));
    }

    /**
     * PUT /api/student/education/{educationId}
     * Updates an education entry on the authenticated student's profile.
     */
    @PutMapping("/{educationId}")
    public ResponseEntity<ApiResponse<StudentEducationResponse>> updateEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse updated = studentProfileService.updateEducation(userDetails.getUsername(), educationId, request);
        return ResponseEntity.ok(ApiResponse.success("Education record updated successfully", updated));
    }

    /**
     * DELETE /api/student/education/{educationId}
     * Deletes an education entry from the authenticated student's profile.
     */
    @DeleteMapping("/{educationId}")
    public ResponseEntity<ApiResponse<Void>> deleteEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId) {
        studentProfileService.deleteEducation(userDetails.getUsername(), educationId);
        return ResponseEntity.ok(ApiResponse.success("Education record deleted successfully", null));
    }
}

