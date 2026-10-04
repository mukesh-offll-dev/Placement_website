package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobEligibleDegree;
import com.gces.placementcell.entity.JobEligibleDepartment;
import com.gces.placementcell.entity.JobPerk;
import com.gces.placementcell.entity.JobRequirement;
import com.gces.placementcell.entity.JobResponsibility;
import com.gces.placementcell.entity.JobSkill;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.function.Function;

/**
 * A job detail page.
 *
 * The child tables (skills, requirements, responsibilities, perks, eligibility, rounds)
 * are flattened to plain lists so the client does not need to know they are separate
 * rows. postedBy is a {@link UserResponse}, never the User entity, so the poster's
 * password hash cannot ride along.
 */
public record JobResponse(
        Long id,
        CompanyResponse company,
        String jobRole,
        String jobDescription,
        EmploymentType jobType,
        String location,
        String ctcText,
        BigDecimal ctcValue,
        Integer vacancies,
        String bond,
        BigDecimal minCgpa,
        Boolean backlogsAllowed,
        Short graduationYear,
        LocalDate applicationDeadline,
        JobStatus status,
        Boolean isActive,
        boolean expired,
        UserResponse postedBy,
        LocalDate postedDate,
        List<String> skills,
        List<String> requirements,
        List<String> responsibilities,
        List<String> perks,
        List<String> eligibleDepartments,
        List<String> eligibleDegrees,
        List<JobSelectionRoundResponse> selectionRounds,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    /**
     * Reads every child collection on the job, so call this inside the transaction that
     * loaded it. A single query cannot fetch them all (more than one List association
     * would make Hibernate throw MultipleBagFetchException), so the remaining bags are
     * initialised lazily here — acceptable for one detail view, not for a listing. Use
     * {@link JobSummaryResponse} for pages.
     */
    public static JobResponse from(Job job) {
        if (job == null) {
            return null;
        }
        return new JobResponse(
                job.getId(),
                CompanyResponse.from(job.getCompany()),
                job.getJobRole(),
                job.getJobDescription(),
                job.getJobType(),
                job.getLocation(),
                job.getCtcText(),
                job.getCtcValue(),
                job.getVacancies(),
                job.getBond(),
                job.getMinCgpa(),
                job.getBacklogsAllowed(),
                job.getGraduationYear(),
                job.getApplicationDeadline(),
                job.getStatus(),
                job.getIsActive(),
                job.isExpired(),
                UserResponse.from(job.getPostedBy()),
                job.getPostedDate(),
                map(job.getSkills(), JobSkill::getSkillName),
                map(job.getRequirements(), JobRequirement::getRequirement),
                map(job.getResponsibilities(), JobResponsibility::getResponsibility),
                map(job.getPerks(), JobPerk::getPerk),
                map(job.getEligibleDepartments(), JobEligibleDepartment::getDepartmentCode),
                map(job.getEligibleDegrees(), JobEligibleDegree::getDegree),
                map(job.getSelectionRounds(), JobSelectionRoundResponse::from),
                job.getCreatedAt(),
                job.getUpdatedAt()
        );
    }

    private static <E, T> List<T> map(Collection<E> source, Function<E, T> mapper) {
        return source == null ? List.of() : source.stream().map(mapper).toList();
    }
}
