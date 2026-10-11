package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.AdminLoginRequest;
import com.gces.placementcell.dto.request.LoginRequestDTO;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.dto.response.UserResponse;

public interface AuthService {

    AuthResponse login(AdminLoginRequest request);

    AuthResponse registerStudent(RegisterRequest request);

    UserResponse getCurrentUser(String email);
}
