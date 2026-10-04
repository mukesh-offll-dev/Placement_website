package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(max = 72) String password) {

        @Override
        public String toString() {
                return "LoginRequest[email=" + email + ", password=[REDACTED]]";
        }
}