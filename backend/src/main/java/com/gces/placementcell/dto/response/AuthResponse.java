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
    private Long userId;
    private String email;
    private String name;
    private UserRole role;
    private String message;
}
