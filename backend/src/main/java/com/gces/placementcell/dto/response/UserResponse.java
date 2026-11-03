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
        LocalDateTime createdAt,
        /** True while the user is still locked to first-login setup. */
        Boolean setupRequired
) {

    /** Without the first-login flag, which defaults to false. */
    public UserResponse(Long id, String email, UserRole role, AccountStatus accountStatus, Boolean isActive,
                        Boolean isEmailVerified, LocalDateTime lastLoginAt, LocalDateTime createdAt) {
        this(id, email, role, accountStatus, isActive, isEmailVerified, lastLoginAt, createdAt, false);
    }

    public static UserResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                // The stand-in address a student has before first-login setup is not real data.
                com.gces.placementcell.service.StudentIdentity.visibleEmail(user.getEmail()),
                user.getRole(),
                user.getAccountStatus(),
                user.getIsActive(),
                user.getIsEmailVerified(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                Boolean.TRUE.equals(user.getMustChangePassword())
        );
    }
}
