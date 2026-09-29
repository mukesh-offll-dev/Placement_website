package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentSummaryResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Protected admin API endpoints.
 * All routes under /admin/** require ROLE_ADMIN (enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    public AdminController(UserRepository userRepository,
                           StudentProfileRepository studentProfileRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    /**
     * GET /api/admin/me
     * Returns the authenticated admin's basic info.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminInfo(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("email", userDetails.getUsername(),
                       "role", "ADMIN")));
    }

    /**
     * GET /api/admin/students
     * Returns a summary list of all registered students.
     */
    @GetMapping("/students")
    public ResponseEntity<ApiResponse<List<StudentSummaryResponse>>> getAllStudents() {
        List<StudentProfile> profiles = studentProfileRepository.findAll();
        List<StudentSummaryResponse> summaries = profiles.stream()
                .map(StudentSummaryResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(summaries));
    }
}
