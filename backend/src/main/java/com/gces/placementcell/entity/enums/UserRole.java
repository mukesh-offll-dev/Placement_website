package com.gces.placementcell.entity.enums;

/**
 * User roles in the Placement Management System.
 * Corresponds to users.role (CHECK chk_users_role) in the DB schema.
 */
public enum UserRole {
    STUDENT,
    PLACEMENT_OFFICER,
    ADMIN,
    RECRUITER,
    /** Verifies profile changes and manages the students of one department. */
    FACULTY_ADVISOR
}
