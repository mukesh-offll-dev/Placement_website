package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.service.StudentProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Protected student API endpoints.
 * All routes under /student/** require ROLE_STUDENT (enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/student")
public class StudentController {

    private final StudentProfileService studentProfileService;

    public StudentController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/me
     * Returns the authenticated student's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        StudentProfileResponse profile = studentProfileService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}

