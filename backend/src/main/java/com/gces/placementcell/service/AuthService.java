package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.AdminLoginRequest;
import com.gces.placementcell.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse login(AdminLoginRequest request);
}
