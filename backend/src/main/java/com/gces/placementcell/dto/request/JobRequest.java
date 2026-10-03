package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Job posting submitted by a placement officer or recruiter.
 *
 * postedBy is taken from the authenticated principal rather than the payload, so a
 * caller cannot attribute a posting to someone else.
 */
public record JobRequest(

        @NotNull(message = "Company is required")
        Long companyId,

        @NotBlank(message = "Job role is required")
        @Size(max = 150, message = "Job role cannot exceed 150 characters")
        String jobRole,

        @Size(max = 4000, message = "Job description cannot exceed 4000 characters")
        String jobDescription,

        @NotNull(message = "Job type is required")
        EmploymentType jobType,

        @Size(max = 120, message = "Location cannot exceed 120 characters")
        String location,

        /** Display form, e.g. "24 LPA". Kept alongside ctcValue so listings can sort numerically. */
        @Size(max = 30, message = "CTC text cannot exceed 30 characters")
        String ctcText,

        @DecimalMin(value = "0.00", message = "CTC value cannot be negative")
        @Digits(integer = 10, fraction = 2, message = "CTC value must have at most 2 decimal places")
        BigDecimal ctcValue,

        @Min(value = 1, message = "There must be at least one vacancy")
        Integer vacancies,

        @Size(max = 100, message = "Bond details cannot exceed 100 characters")
        String bond,

        @DecimalMin(value = "0.00", message = "Minimum CGPA cannot be negative")
        @DecimalMax(value = "10.00", message = "Minimum CGPA cannot exceed 10.00")
        @Digits(integer = 2, fraction = 2, message = "Minimum CGPA must have at most 2 decimal places")
        BigDecimal minCgpa,

        Boolean backlogsAllowed,

        @Min(value = 1950, message = "Graduation year must be 1950 or later")
        @Max(value = 2100, message = "Graduation year is unrealistically far in the future")
        Short graduationYear,

        @NotNull(message = "Application deadline is required")
        LocalDate applicationDeadline,

        JobStatus status,

        @Size(max = 50, message = "A job cannot list more than 50 skills")
        List<@NotBlank(message = "Skill name cannot be blank")
             @Size(max = 60, message = "Skill name cannot exceed 60 characters") String> skills,

        @Size(max = 50, message = "A job cannot list more than 50 requirements")
        List<@NotBlank(message = "Requirement cannot be blank")
             @Size(max = 300, message = "Requirement cannot exceed 300 characters") String> requirements
) {
}
