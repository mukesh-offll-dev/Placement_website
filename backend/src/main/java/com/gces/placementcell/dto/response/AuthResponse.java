package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    @Builder.Default
    private String type = "Bearer";
    private Long userId;
    /** Null for a student who has not yet set a real email (the stand-in address is never exposed). */
    private String email;
    /** Display name; the frontend stores and renders this field. */
    private String fullName;
    /** Same value as fullName, kept for callers written against the earlier shape. */
    private String name;
    private UserRole role;
    private String message;
    /**
     * The user must finish first-login setup (replace the initial credentials, add name, email and
     * phone) before anything else. The API refuses other requests until they do.
     */
    private boolean setupRequired;
}
