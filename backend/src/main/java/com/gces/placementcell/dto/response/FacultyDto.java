package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.User;

import java.time.LocalDateTime;

/** A faculty advisor account as shown to admins (and to the advisor on /faculty/me). Never carries a password. */
public record FacultyDto(
        Long id,
        Long userId,
        String fullName,
        String email,
        String phone,
        String designation,
        boolean active,
        boolean mustChangePassword,
        DepartmentRef department,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt
) {

    public static FacultyDto from(FacultyProfile faculty) {
        User user = faculty.getUser();
        return new FacultyDto(
                faculty.getId(),
                user.getId(),
                faculty.getFullName(),
                user.getEmail(),
                faculty.getPhone(),
                faculty.getDesignation(),
                Boolean.TRUE.equals(user.getIsActive()) && !Boolean.TRUE.equals(user.getIsDeleted()),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                DepartmentRef.from(faculty.getDepartment()),
                user.getLastLoginAt(),
                faculty.getCreatedAt());
    }
}