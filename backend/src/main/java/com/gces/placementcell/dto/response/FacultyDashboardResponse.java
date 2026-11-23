package com.gces.placementcell.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/** GET /faculty/dashboard: counts for the advisor's department and recent verification activity. */
public record FacultyDashboardResponse(
        DepartmentRef department,
        long totalStudents,
        long activeStudents,
        long disabledStudents,
        long archivedStudents,
        long verifiedProfiles,
        long pendingRequests,
        long rejectedRequests,
        long notSubmitted,
        List<Activity> recentActivity
) {

    public record Activity(Long versionId, Long studentId, String studentName, String rollNo, String action,
                           String actorName, String comment, LocalDateTime at) {
    }
}