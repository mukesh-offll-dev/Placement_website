package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.dto.response.UserResponse;

/**
 * Registration, login and current-user lookup for students and staff.
 */
public interface AuthService {

    AuthResponse registerStudent(RegisterRequest request);

    AuthResponse registerAdmin(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserResponse getCurrentUser(String email);
}
