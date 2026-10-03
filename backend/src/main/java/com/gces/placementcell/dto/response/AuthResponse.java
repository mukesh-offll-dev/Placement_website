package com.gces.placementcell.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gces.placementcell.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Returned by /api/auth/login and /api/auth/register.
 * Contains the JWT and enough user info for the frontend to bootstrap UI state.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String token;

    @Builder.Default
    private String type = "Bearer";

    private Long userId;
    private String email;
    private UserRole role;

    /** Display name pulled from student/admin profile — optional. */
    private String fullName;

    public Long getId() {
        return userId;
    }
}
