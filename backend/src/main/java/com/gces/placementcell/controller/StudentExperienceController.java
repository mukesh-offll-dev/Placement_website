package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentExperienceResponse;
import com.gces.placementcell.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated student experience / internship records.
 * Paths: /api/student/experience, /api/student/internships
 * Requires: ROLE_STUDENT
 */
@RestController
@RequestMapping({"/student/experience", "/student/internships"})
public class StudentExperienceController {

    private final StudentProfileService studentProfileService;

    public StudentExperienceController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/experience
     * Retrieves all experience / internship entries of the authenticated student.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentExperienceResponse>>> getExperience(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentExperienceResponse> experience = studentProfileService.getExperience(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(experience));
    }

    /**
     * POST /api/student/experience
     * Adds an experience / internship entry to the authenticated student's profile.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentExperienceResponse>> addExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentExperienceRequest request) {
        StudentExperienceResponse experience = studentProfileService.addExperience(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Experience record added successfully", experience));
    }

    /**
     * PUT /api/student/experience/{experienceId}
     * Updates an experience / internship entry on the authenticated student's profile.
     */
    @PutMapping("/{experienceId}")
    public ResponseEntity<ApiResponse<StudentExperienceResponse>> updateExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long experienceId,
            @Valid @RequestBody StudentExperienceRequest request) {
        StudentExperienceResponse updated = studentProfileService.updateExperience(userDetails.getUsername(), experienceId, request);
        return ResponseEntity.ok(ApiResponse.success("Experience record updated successfully", updated));
    }

    /**
     * DELETE /api/student/experience/{experienceId}
     * Deletes an experience / internship entry from the authenticated student's profile.
     */
    @DeleteMapping("/{experienceId}")
    public ResponseEntity<ApiResponse<Void>> deleteExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long experienceId) {
        studentProfileService.deleteExperience(userDetails.getUsername(), experienceId);
        return ResponseEntity.ok(ApiResponse.success("Experience record deleted successfully", null));
    }
}

