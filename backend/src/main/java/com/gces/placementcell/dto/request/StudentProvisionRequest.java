package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentProvisionRequest(
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 12, max = 72) String password) {

        @Override
        public String toString() {
                return "StudentProvisionRequest[email=" + email + ", password=[REDACTED]]";
        }
}