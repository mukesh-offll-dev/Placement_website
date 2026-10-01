package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication endpoints.
 *
 * All routes under /auth/** are PUBLIC (no JWT required).
 * Admin registration is additionally protected to only be callable
 * by an existing ADMIN (via @PreAuthorize) — so the very first admin
 * must be created via the seed SQL script.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/register/student
     * Open registration for students.
     */
    @PostMapping("/register/student")
    public ResponseEntity<ApiResponse<AuthResponse>> registerStudent(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse authResponse = authService.registerStudent(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student registered successfully", authResponse));
    }

    /**
     * POST /api/auth/register/admin
     * Protected: only an existing ADMIN can create another admin.
     *
     * For the very first admin, insert directly via SQL:
     *   INSERT INTO users (email, password_hash, role, account_status, is_active, ...)
     *   VALUES ('admin@gce.edu.in', '$2a$10$...bcrypt_hash...', 'ADMIN', 'ACTIVE', true, ...)
     */
    @PostMapping("/register/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AuthResponse>> registerAdmin(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse authResponse = authService.registerAdmin(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Admin registered successfully", authResponse));
    }

    /**
     * POST /api/auth/login
     * Works for both STUDENT and ADMIN.
     * The frontend uses the returned {@code role} field to redirect appropriately.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }
}
