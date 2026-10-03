package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;

import java.math.BigDecimal;

/**
 * A student as shown in the placement cell's directory listing.
 *
 * Touches no lazy association, so it is safe to map a whole page of profiles without
 * triggering a query per row.
 */
public record StudentSummaryResponse(
        Long id,
        String rollNo,
        String fullName,
        String email,
        String avatarUrl,
        String department,
        String departmentCode,
        String batch,
        Short semester,
        BigDecimal cgpa,
        Integer activeBacklogs,
        PlacementStatus placementStatus,
        Boolean isOpenToOpportunities,
        Short profileCompletionPercent
) {

    public static StudentSummaryResponse from(StudentProfile profile) {
        if (profile == null) {
            return null;
        }
        return new StudentSummaryResponse(
                profile.getId(),
                profile.getRollNo(),
                profile.getFullName(),
                profile.getEmail(),
                profile.getAvatarUrl(),
                profile.getDepartment(),
                profile.getDepartmentCode(),
                profile.getBatch(),
                profile.getSemester() != null ? profile.getSemester().shortValue() : null,
                profile.getCgpa(),
                profile.getActiveBacklogs(),
                profile.getPlacementStatus(),
                profile.getIsOpenToOpportunities(),
                profile.getProfileCompletionPercent() != null ? profile.getProfileCompletionPercent().shortValue() : null
        );
    }
}
