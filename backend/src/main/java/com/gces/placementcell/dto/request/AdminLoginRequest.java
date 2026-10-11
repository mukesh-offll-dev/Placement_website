package com.gces.placementcell.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AdminLoginRequest {

    private String username;
    private String email;
    private String expectedRole;

    @NotBlank(message = "Password is required")
    private String password;

    public String getUsername() {
        if (username != null && !username.isBlank()) {
            return username;
        }
        return email != null ? email : "";
    }
}
