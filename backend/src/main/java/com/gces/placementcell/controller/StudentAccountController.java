package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.ChangePasswordRequest;
import com.gces.placementcell.dto.request.StudentSetupRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.service.StudentAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in student's own account. SecurityConfig restricts /student/** to the STUDENT role,
 * and PasswordChangeRequiredFilter leaves only /student/account/setup open until setup is done.
 */
@RestController
@RequestMapping("/student/account")
@RequiredArgsConstructor
public class StudentAccountController {

    private final StudentAccountService studentAccountService;

    /** First login: new password plus name, email and phone. Returns a fresh token. */
    @PostMapping("/setup")
    public ResponseEntity<ApiResponse<AuthResponse>> completeFirstLogin(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentSetupRequest request) {
        AuthResponse response = studentAccountService.completeFirstLogin(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile set up successfully", response));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<AuthResponse>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        AuthResponse response = studentAccountService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", response));
    }
}
