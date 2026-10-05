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
    private String email;
    /** Display name; the frontend stores and renders this field. */
    private String fullName;
    /** Same value as fullName, kept for callers written against the earlier shape. */
    private String name;
    private UserRole role;
    private String message;
}
