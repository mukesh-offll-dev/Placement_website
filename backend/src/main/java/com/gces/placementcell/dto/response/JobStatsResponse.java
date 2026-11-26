package com.gces.placementcell.dto.response;

public record JobStatsResponse(
        long totalJobs,
        long activeJobs,
        long closedJobs,
        long upcomingDeadlines
) {
}
