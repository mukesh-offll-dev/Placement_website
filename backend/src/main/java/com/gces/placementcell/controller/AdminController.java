package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentSummaryResponse;
import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller exposing features accessible exclusively to Admins.
 * All routes under /admin/** require ROLE_ADMIN (enforced by SecurityConfig and @PreAuthorize).
 */
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public AdminController(UserRepository userRepository,
                           AdminProfileRepository adminProfileRepository,
                           StudentProfileRepository studentProfileRepository,
                           JobRepository jobRepository,
                           JobApplicationRepository jobApplicationRepository) {
        this.userRepository = userRepository;
        this.adminProfileRepository = adminProfileRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobRepository = jobRepository;
        this.jobApplicationRepository = jobApplicationRepository;
    }

    /**
     * GET /api/admin/dashboard
     * Returns statistics for admin dashboard.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminDashboard(Authentication authentication) {
        long registeredStudents = userRepository.countByRoleAndIsDeletedFalse(UserRole.STUDENT);
        long activeJobs = jobRepository.findByStatus(JobStatus.ACTIVE).size();
        long totalApplications = jobApplicationRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("registeredStudents", registeredStudents);
        stats.put("activeJobs", activeJobs);
        stats.put("totalApplications", totalApplications);
        stats.put("adminEmail", authentication.getName());
        stats.put("portal", "Admin Management Console");

        return ResponseEntity.ok(ApiResponse.success("Admin dashboard loaded successfully", stats));
    }

    /**
     * GET /api/admin/profile
     * Returns profile details for the authenticated admin.
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminProfile(Authentication authentication) {
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(authentication.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("Admin user not found"));
        }

        User user = userOpt.get();
        Optional<AdminProfile> profileOpt = adminProfileRepository.findByUserId(user.getId());

        Map<String, Object> profileData = new HashMap<>();
        profileData.put("id", user.getId());
        profileData.put("email", user.getEmail());
        profileData.put("role", user.getRole().name());

        profileOpt.ifPresent(profile -> {
            profileData.put("name", profile.getName());
            profileData.put("designation", profile.getDesignation());
            profileData.put("department", profile.getDepartment());
            profileData.put("contactEmail", profile.getContactEmail());
        });

        return ResponseEntity.ok(ApiResponse.success("Admin profile loaded successfully", profileData));
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
