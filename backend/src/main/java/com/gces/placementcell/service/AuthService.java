package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.LoginRequestDTO;
import com.gces.placementcell.dto.response.LoginResponseDTO;

public interface AuthService {

    LoginResponseDTO login(LoginRequestDTO request);

    LoginResponseDTO getCurrentUser(String email);
}
