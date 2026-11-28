package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.ForgotPasswordRequest;
import com.gces.placementcell.dto.request.ResetPasswordRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public password recovery (everything under /auth/** is open). The forgot-password answer is
 * identical for every identifier, so it cannot be used to find out which accounts exist.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class PasswordResetController {

    static final String GENERIC_FORGOT_MESSAGE =
            "If an account matches, a password reset link has been sent to its email address. "
                    + "It expires in 30 minutes. If nothing arrives, contact the placement cell.";

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.identifier());
        return ResponseEntity.ok(ApiResponse.success(GENERIC_FORGOT_MESSAGE));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        UserRole role = passwordResetService.resetPassword(request.token(), request.newPassword());
        // Only someone holding a valid link ever sees this: it picks the right sign-in page.
        return ResponseEntity.ok(ApiResponse.success("Your password has been updated. You can now sign in.",
                role == null ? Map.of() : Map.of("role", role.name())));
    }
}
