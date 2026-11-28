package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Asks for a reset link. The identifier is an email address, or a student's register number. */
public record ForgotPasswordRequest(

        @NotBlank(message = "Enter your email address or register number")
        @Size(max = 150, message = "That is too long to be an email address or register number")
        String identifier
) {
}
