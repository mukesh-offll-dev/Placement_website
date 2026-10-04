package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.AdminLoginRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AdminLoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/admin/login")
    public ResponseEntity<ApiResponse<AuthResponse>> adminLogin(@Valid @RequestBody AdminLoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Admin login successful", response));
    }
}
