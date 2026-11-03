package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credentials submitted at login.
 *
 * Staff sign in with an email. Students sign in with their register number and may not use
 * an email at all; AuthServiceImpl enforces that, so it does not depend on which page was used.
 * Supply exactly one of {@code email} or {@code registerNumber}.
 *
 * The raw password only ever travels inbound; it is hashed on arrival and never
 * appears on any response DTO.
 */
public record LoginRequest(

        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        // No minimum length here: login only checks whether the password matches.
        // Strength rules belong on RegisterRequest; enforcing them at login would lock
        // out any existing account whose password predates or bypassed that policy.
        @NotBlank(message = "Password is required")
        @Size(max = 100, message = "Password cannot exceed 100 characters")
        String password,

        String expectedRole,

        @Size(max = 30, message = "Register number cannot exceed 30 characters")
        String registerNumber
) {
    public LoginRequest(String email, String password, String expectedRole) {
        this(email, password, expectedRole, null);
    }

    public LoginRequest(String email, String password) {
        this(email, password, null, null);
    }

    /** A student login: register number plus password. */
    public static LoginRequest forStudent(String registerNumber, String password) {
        return new LoginRequest(null, password, "STUDENT", registerNumber);
    }
}
