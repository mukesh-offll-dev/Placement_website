package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.ApiResponse;
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
 * REST controller for authenticated student skill operations.
 * Path: /api/student/skills
 * Requires: ROLE_STUDENT
 */
@RestController
@RequestMapping("/student/skills")
public class StudentSkillController {

    private final StudentProfileService studentProfileService;

    public StudentSkillController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/skills
     * Retrieves all skills of the authenticated student.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentSkillResponse>>> getSkills(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentSkillResponse> skills = studentProfileService.getSkills(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(skills));
    }

    /**
     * PUT /api/student/skills
     * Updates/replaces all skills of the authenticated student.
     */
    @PutMapping
    public ResponseEntity<ApiResponse<List<StudentSkillResponse>>> updateSkills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody List<String> skills) {
        List<StudentSkillResponse> updated = studentProfileService.updateSkills(userDetails.getUsername(), skills);
        return ResponseEntity.ok(ApiResponse.success("Skills updated successfully", updated));
    }

    /**
     * POST /api/student/skills
     * Adds a single skill to the authenticated student's profile.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentSkillResponse>> addSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentSkillRequest request) {
        StudentSkillResponse newSkill = studentProfileService.addSkill(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Skill added successfully", newSkill));
    }

    /**
     * PUT /api/student/skills/{skillId}
     * Updates a single skill on the authenticated student's profile.
     */
    @PutMapping("/{skillId}")
    public ResponseEntity<ApiResponse<StudentSkillResponse>> updateSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long skillId,
            @Valid @RequestBody StudentSkillRequest request) {
        StudentSkillResponse updated = studentProfileService.updateSkill(userDetails.getUsername(), skillId, request);
        return ResponseEntity.ok(ApiResponse.success("Skill updated successfully", updated));
    }

    /**
     * DELETE /api/student/skills/{skillId}
     * Deletes a skill from the authenticated student's profile.
     */
    @DeleteMapping("/{skillId}")
    public ResponseEntity<ApiResponse<Void>> deleteSkill(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long skillId) {
        studentProfileService.deleteSkill(userDetails.getUsername(), skillId);
        return ResponseEntity.ok(ApiResponse.success("Skill deleted successfully", null));
    }
}

