package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.dto.response.StudentExperienceResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.StudentSkillResponse;
import com.gces.placementcell.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    /**
     * GET /api/student/profile/skills
     * Retrieves all skills of the authenticated student.
     */
    @GetMapping("/skills")
    public ResponseEntity<ApiResponse<List<StudentSkillResponse>>> getSkills(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentSkillResponse> skills = studentProfileService.getSkills(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(skills));
    }

    /**
     * PUT /api/student/profile/skills
     * Updates/replaces all skills of the authenticated student.
     */
    @PutMapping("/skills")
    public ResponseEntity<ApiResponse<List<StudentSkillResponse>>> updateSkills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody List<String> skills) {
        List<StudentSkillResponse> updated = studentProfileService.updateSkills(userDetails.getUsername(), skills);
        return ResponseEntity.ok(ApiResponse.success("Skills updated successfully", updated));
    }

    /**
     * POST /api/student/profile/skills
     * Adds a single skill to the authenticated student's profile.
     */
    @PostMapping("/skills")
    public ResponseEntity<ApiResponse<StudentSkillResponse>> addSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentSkillRequest request) {
        StudentSkillResponse newSkill = studentProfileService.addSkill(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Skill added successfully", newSkill));
    }

    /**
     * PUT /api/student/profile/skills/{skillId}
     * Updates a single skill on the authenticated student's profile.
     */
    @PutMapping("/skills/{skillId}")
    public ResponseEntity<ApiResponse<StudentSkillResponse>> updateSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long skillId,
            @Valid @RequestBody StudentSkillRequest request) {
        StudentSkillResponse updated = studentProfileService.updateSkill(userDetails.getUsername(), skillId, request);
        return ResponseEntity.ok(ApiResponse.success("Skill updated successfully", updated));
    }

    /**
     * DELETE /api/student/profile/skills/{skillId}
     * Deletes a skill from the authenticated student's profile.
     */
    @DeleteMapping("/skills/{skillId}")
    public ResponseEntity<ApiResponse<Void>> deleteSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long skillId) {
        studentProfileService.deleteSkill(userDetails.getUsername(), skillId);
        return ResponseEntity.ok(ApiResponse.success("Skill deleted successfully", null));
    }

    /**
     * GET /api/student/profile/education
     * Retrieves all education entries of the authenticated student.
     */
    @GetMapping("/education")
    public ResponseEntity<ApiResponse<List<StudentEducationResponse>>> getEducation(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentEducationResponse> education = studentProfileService.getEducation(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(education));
    }

    /**
     * POST /api/student/profile/education
     * Adds an education entry to the authenticated student's profile.
     */
    @PostMapping("/education")
    public ResponseEntity<ApiResponse<StudentEducationResponse>> addEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse education = studentProfileService.addEducation(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Education record added successfully", education));
    }

    /**
     * PUT /api/student/profile/education/{educationId}
     * Updates an education entry on the authenticated student's profile.
     */
    @PutMapping("/education/{educationId}")
    public ResponseEntity<ApiResponse<StudentEducationResponse>> updateEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId,
            @Valid @RequestBody StudentEducationRequest request) {
        StudentEducationResponse updated = studentProfileService.updateEducation(userDetails.getUsername(), educationId, request);
        return ResponseEntity.ok(ApiResponse.success("Education record updated successfully", updated));
    }

    /**
     * DELETE /api/student/profile/education/{educationId}
     * Deletes an education entry from the authenticated student's profile.
     */
    @DeleteMapping("/education/{educationId}")
    public ResponseEntity<ApiResponse<Void>> deleteEducation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long educationId) {
        studentProfileService.deleteEducation(userDetails.getUsername(), educationId);
        return ResponseEntity.ok(ApiResponse.success("Education record deleted successfully", null));
    }

    /**
     * GET /api/student/profile/experience
     * Retrieves all experience / internship entries of the authenticated student.
     */
    @GetMapping("/experience")
    public ResponseEntity<ApiResponse<List<StudentExperienceResponse>>> getExperience(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentExperienceResponse> experience = studentProfileService.getExperience(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(experience));
    }

    /**
     * POST /api/student/profile/experience
     * Adds an experience / internship entry to the authenticated student's profile.
     */
    @PostMapping("/experience")
    public ResponseEntity<ApiResponse<StudentExperienceResponse>> addExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentExperienceRequest request) {
        StudentExperienceResponse experience = studentProfileService.addExperience(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Experience record added successfully", experience));
    }

    /**
     * PUT /api/student/profile/experience/{experienceId}
     * Updates an experience / internship entry on the authenticated student's profile.
     */
    @PutMapping("/experience/{experienceId}")
    public ResponseEntity<ApiResponse<StudentExperienceResponse>> updateExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long experienceId,
            @Valid @RequestBody StudentExperienceRequest request) {
        StudentExperienceResponse updated = studentProfileService.updateExperience(userDetails.getUsername(), experienceId, request);
        return ResponseEntity.ok(ApiResponse.success("Experience record updated successfully", updated));
    }

    /**
     * DELETE /api/student/profile/experience/{experienceId}
     * Deletes an experience / internship entry from the authenticated student's profile.
     */
    @DeleteMapping("/experience/{experienceId}")
    public ResponseEntity<ApiResponse<Void>> deleteExperience(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long experienceId) {
        studentProfileService.deleteExperience(userDetails.getUsername(), experienceId);
        return ResponseEntity.ok(ApiResponse.success("Experience record deleted successfully", null));
    }
}
