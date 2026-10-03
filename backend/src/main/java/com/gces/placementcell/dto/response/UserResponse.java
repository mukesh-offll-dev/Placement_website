package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;

import java.time.LocalDateTime;

/**
 * A login row as seen by API callers.
 *
 * There is deliberately no passwordHash component. The User entity carries the hash and
 * is never serialised directly; every endpoint returns this projection instead, so the
 * hash cannot leak through a response body even if someone adds a field to the entity.
 */
public record UserResponse(
        Long id,
        String email,
        UserRole role,
        AccountStatus accountStatus,
        Boolean isActive,
        Boolean isEmailVerified,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt
) {

    public static UserResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getAccountStatus(),
                user.getIsActive(),
                user.getIsEmailVerified(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }
}
