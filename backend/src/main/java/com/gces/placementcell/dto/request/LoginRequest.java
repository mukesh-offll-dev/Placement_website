package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credentials submitted at login.
 *
 * The raw password only ever travels inbound; it is hashed on arrival and never
 * appears on any response DTO.
 */
public record LoginRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        // No minimum length here: login only checks whether the password matches.
        // Strength rules belong on RegisterRequest; enforcing them at login would lock
        // out any existing account whose password predates or bypassed that policy.
        @NotBlank(message = "Password is required")
        @Size(max = 100, message = "Password cannot exceed 100 characters")
        String password,

        String expectedRole
) {
    public LoginRequest(String email, String password) {
        this(email, password, null);
    }
}
