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

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String password,

        String expectedRole
) {
    public LoginRequest(String email, String password) {
        this(email, password, null);
    }
}
