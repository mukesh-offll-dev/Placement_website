package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controller exposing features accessible exclusively to Students.
 */
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository jobApplicationRepository;

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

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentProfile(Authentication authentication) {
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(authentication.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("Student user not found"));
        }

        User user = userOpt.get();
        Optional<StudentProfile> profileOpt = studentProfileRepository.findByUserId(user.getId());

        Map<String, Object> profileData = new HashMap<>();
        profileData.put("id", user.getId());
        profileData.put("email", user.getEmail());
        profileData.put("role", user.getRole().name());

        profileOpt.ifPresent(profile -> {
            profileData.put("fullName", profile.getFullName());
            profileData.put("rollNo", profile.getRollNo());
            profileData.put("departmentCode", profile.getDepartmentCode());
            profileData.put("batch", profile.getBatch());
            profileData.put("cgpa", profile.getCgpa());
            profileData.put("placementStatus", profile.getPlacementStatus() != null ? profile.getPlacementStatus().name() : null);
            profileData.put("isOpenToOpportunities", profile.getIsOpenToOpportunities());
        });

        return ResponseEntity.ok(ApiResponse.success("Student profile loaded successfully", profileData));
    }
}
