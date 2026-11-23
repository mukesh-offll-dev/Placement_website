package com.gces.placementcell.service;

import com.gces.placementcell.entity.StudentProfile;

import java.util.Locale;

/**
 * Which students a caller may see and change. Built by the controller layer from the authenticated
 * user (never from request parameters) and passed into the services, which apply it to every query.
 *
 * @param departmentCode null = every department (admin, placement officer); else only this code
 * @param adminCapable          whether admin-only operations (RESTORE, batch archive) are allowed
 * @param role           label used in audit details (ADMIN, PLACEMENT_OFFICER, FACULTY_ADVISOR)
 */
public record StudentScope(String departmentCode, boolean adminCapable, String role) {

    public static StudentScope forAdmin() {
        return new StudentScope(null, true, "ADMIN");
    }

    public static StudentScope officer() {
        return new StudentScope(null, false, "PLACEMENT_OFFICER");
    }

    public static StudentScope faculty(String departmentCode) {
        if (departmentCode == null || departmentCode.isBlank()) {
            throw new IllegalArgumentException("A faculty scope needs a department");
        }
        return new StudentScope(departmentCode.trim().toUpperCase(Locale.ROOT), false, "FACULTY_ADVISOR");
    }

    public boolean isDepartmentScoped() {
        return departmentCode != null;
    }

    /** Whether this student belongs to the scope. */
    public boolean allows(StudentProfile profile) {
        if (departmentCode == null) {
            return true;
        }
        return profile != null && profile.getDepartmentCode() != null
                && departmentCode.equalsIgnoreCase(profile.getDepartmentCode().trim());
    }
}
