package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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

        Long companyId,

        @Size(max = 150, message = "Company name cannot exceed 150 characters")
        String companyName,

        @Pattern(regexp = "^(https?://.+)?$", message = "Company website must be a valid http:// or https:// URL")
        @Size(max = 500, message = "Company website cannot exceed 500 characters")
        String companyWebsite,

        @Email(message = "Please enter a valid contact email address")
        @Size(max = 150, message = "Contact email cannot exceed 150 characters")
        String contactEmail,

        @Size(max = 1000, message = "Company logo URL cannot exceed 1000 characters")
        String companyLogoUrl,

        Boolean removeLogo,

        @NotBlank(message = "Job role is required")
        @Size(max = 150, message = "Job role cannot exceed 150 characters")
        String jobRole,

        @Size(max = 4000, message = "Job description cannot exceed 4000 characters")
        String jobDescription,

        @NotNull(message = "Job type is required")
        EmploymentType jobType,

        @Size(max = 120, message = "Location cannot exceed 120 characters")
        String location,

        @Size(max = 30, message = "CTC text cannot exceed 30 characters")
        String ctcText,

        @NotNull(message = "CTC must be a valid positive number")
        @DecimalMin(value = "0.01", message = "CTC must be a valid positive number")
        @Digits(integer = 10, fraction = 2, message = "CTC value must have at most 2 decimal places")
        BigDecimal ctcValue,

        @Min(value = 1, message = "There must be at least one vacancy")
        Integer vacancies,

        @Size(max = 100, message = "Bond details cannot exceed 100 characters")
        String bond,

        @NotNull(message = "Minimum CGPA eligibility is required")
        @DecimalMin(value = "0.00", message = "Minimum CGPA must be between 0 and 10")
        @DecimalMax(value = "10.00", message = "Minimum CGPA must be between 0 and 10")
        @Digits(integer = 2, fraction = 2, message = "Minimum CGPA must have at most 2 decimal places")
        BigDecimal minCgpa,

        @DecimalMin(value = "0.00", message = "Maximum CGPA must be between 0 and 10")
        @DecimalMax(value = "10.00", message = "Maximum CGPA must be between 0 and 10")
        @Digits(integer = 2, fraction = 2, message = "Maximum CGPA must have at most 2 decimal places")
        BigDecimal maxCgpa,

        Boolean backlogsAllowed,

        @Min(value = 1950, message = "Graduation year must be 1950 or later")
        @Max(value = 2100, message = "Graduation year is unrealistically far in the future")
        Short graduationYear,

        @NotNull(message = "Application deadline is required")
        @FutureOrPresent(message = "Application deadline cannot be in the past")
        LocalDate applicationDeadline,

        @Pattern(regexp = "^(https?://.+)?$", message = "Application URL must be a valid http:// or https:// URL")
        @Size(max = 500, message = "Application URL cannot exceed 500 characters")
        String applicationUrl,

        @Size(max = 1000, message = "Application instructions cannot exceed 1000 characters")
        String applicationInstructions,

        JobStatus status,

        List<@NotBlank(message = "Skill name cannot be blank")
             @Size(max = 60, message = "Skill name cannot exceed 60 characters") String> skills,

        List<@NotBlank(message = "Requirement cannot be blank")
             @Size(max = 300, message = "Requirement cannot exceed 300 characters") String> requirements,

        List<@NotBlank(message = "Responsibility cannot be blank")
             @Size(max = 300, message = "Responsibility cannot exceed 300 characters") String> responsibilities,

        List<@NotBlank(message = "Perk cannot be blank")
             @Size(max = 150, message = "Perk cannot exceed 150 characters") String> perks,

        List<@NotBlank(message = "Interview round cannot be blank")
             @Size(max = 120, message = "Interview round cannot exceed 120 characters") String> selectionRounds
) {
    @AssertTrue(message = "Company is required")
    public boolean isCompanyProvided() {
        return companyId != null || (companyName != null && !companyName.isBlank());
    }

    @AssertTrue(message = "Minimum CGPA must not exceed Maximum CGPA")
    public boolean isCgpaRangeValid() {
        return minCgpa == null || maxCgpa == null || minCgpa.compareTo(maxCgpa) <= 0;
    }
}
