package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Sets a new password with the token from the emailed link. Same password rules as a change. */
public record ResetPasswordRequest(

        @NotBlank(message = "The reset link is missing its token")
        @Size(max = 200, message = "The reset link is not valid")
        String token,

        @NotBlank(message = "New password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "Password must contain an uppercase letter, a lowercase letter and a digit"
        )
        String newPassword
) {
}
