package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentProfileUpdateRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/students/me/profile")
public class StudentProfileController {

    private final StudentProfileService studentProfileService;

    public StudentProfileController(StudentProfileService studentProfileService) {
        this.studentProfileService = studentProfileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getProfile(
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.success(
                studentProfileService.getProfile(jwt.getSubject())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StudentProfileUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Profile updated",
                studentProfileService.updateProfile(jwt.getSubject(), request)));
    }
}