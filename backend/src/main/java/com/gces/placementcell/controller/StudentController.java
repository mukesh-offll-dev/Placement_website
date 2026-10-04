package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.StudentProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controller exposing features accessible exclusively to Students.
 * All routes under /student/** require ROLE_STUDENT (enforced by SecurityConfig and @PreAuthorize).
 */
@RestController
@RequestMapping("/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final StudentProfileService studentProfileService;

    public StudentController(UserRepository userRepository,
                             StudentProfileRepository studentProfileRepository,
                             JobRepository jobRepository,
                             JobApplicationRepository jobApplicationRepository,
                             StudentProfileService studentProfileService) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobRepository = jobRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.studentProfileService = studentProfileService;
    }

    /**
     * GET /api/student/dashboard
     * Returns personal statistics and placement status for the student dashboard.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentDashboard(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(email);
        
        long appliedJobsCount = 0;
        String studentName = email;
        String placementStatus = "UNKNOWN";

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            appliedJobsCount = jobApplicationRepository.findByStudentProfileUserId(user.getId()).size();
            Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());
            if (profileOpt.isPresent()) {
                studentName = profileOpt.get().getFullName();
                placementStatus = profileOpt.get().getPlacementStatus() != null ? profileOpt.get().getPlacementStatus().name() : "UNPLACED";
            }
        }

        long activeJobsCount = jobRepository.findByStatus(JobStatus.ACTIVE).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("studentEmail", email);
        stats.put("studentName", studentName);
        stats.put("appliedJobsCount", appliedJobsCount);
        stats.put("activeJobsCount", activeJobsCount);
        stats.put("placementStatus", placementStatus);
        stats.put("portal", "Student Career Portal");

        return ResponseEntity.ok(ApiResponse.success("Student dashboard loaded successfully", stats));
    }

    /**
     * GET /api/student/me
     * Returns the authenticated student's full profile.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        StudentProfileResponse profile = studentProfileService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
