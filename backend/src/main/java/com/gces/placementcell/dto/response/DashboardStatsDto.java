package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {

    private long totalStudents;
    private long totalPlaced;
    private long totalUnplaced;
    private double placementPercentage;

    private long totalCompanies;
    private long totalApplications;
    private long selectedStudents;

    // Jobs summary
    private long totalActiveJobs;
    private long totalJobs;
    private long jobsPostedThisWeek;
    private long applicationsToday;

    // Breakdown maps
    private Map<String, Long> departmentStudentCount;
    private Map<String, Long> departmentPlacementCount;
    private List<DepartmentStatDto> departmentStats;

    // Recent activity
    private List<RecentJobDto> recentJobs;
    private List<RecentApplicationDto> recentApplications;
}
