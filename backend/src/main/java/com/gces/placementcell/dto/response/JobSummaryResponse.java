package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A job as shown on a listing card.
 *
 * Reads company but no collection, which is exactly what
 * {@code JobRepository.findByIsDeletedFalse(Pageable)} fetches through its entity graph,
 * so mapping a page costs one query rather than one per row.
 */
public record JobSummaryResponse(
        Long id,
        CompanyResponse company,
        String jobRole,
        EmploymentType jobType,
        String location,
        String ctcText,
        BigDecimal ctcValue,
        Integer vacancies,
        BigDecimal minCgpa,
        Boolean backlogsAllowed,
        LocalDate applicationDeadline,
        LocalDate postedDate,
        JobStatus status,
        Boolean isActive,
        boolean expired
) {

    public static JobSummaryResponse from(Job job) {
        if (job == null) {
            return null;
        }
        return new JobSummaryResponse(
                job.getId(),
                CompanyResponse.from(job.getCompany()),
                job.getJobRole(),
                job.getJobType(),
                job.getLocation(),
                job.getCtcText(),
                job.getCtcValue(),
                job.getVacancies(),
                job.getMinCgpa(),
                job.getBacklogsAllowed(),
                job.getApplicationDeadline(),
                job.getPostedDate(),
                job.getStatus(),
                job.getIsActive(),
                job.isExpired()
        );
    }
}
