package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;

/**
 * Contract for authentication operations (register, login).
 */
public interface AuthService {

    /** Register a new STUDENT and return a JWT immediately. */
    AuthResponse registerStudent(RegisterRequest request);

    /** Register a new ADMIN. Should only be called through a safe/restricted channel. */
    AuthResponse registerAdmin(RegisterRequest request);

    /**
     * Authenticate via email + password.
     * Works for both STUDENT and ADMIN — role is embedded in the returned JWT.
     */
    AuthResponse login(LoginRequest request);
}
