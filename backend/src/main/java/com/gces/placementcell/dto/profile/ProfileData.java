package com.gces.placementcell.dto.profile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * The student-editable part of a profile, as stored in student_profile_versions.data / base_data and
 * exchanged with the draft and verification endpoints. Admin-managed fields (register number,
 * department, batch, degree, account email, placement fields) are deliberately absent, so a draft can
 * never change them. Unknown JSON keys are ignored; known keys are validated strictly.
 *
 * {@code id} on a list item is the id of the official row it was copied from (null for new items).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProfileData(
        @Valid Personal personal,
        @Valid Academic academic,
        @Size(max = 50, message = "At most 50 skills") List<@Valid @NotNull SkillItem> skills,
        @Size(max = 50, message = "At most 50 education entries") List<@Valid @NotNull EducationItem> education,
        @Size(max = 50, message = "At most 50 experience entries") List<@Valid @NotNull ExperienceItem> experience,
        @Size(max = 50, message = "At most 50 projects") List<@Valid @NotNull ProjectItem> projects,
        @Size(max = 50, message = "At most 50 certifications") List<@Valid @NotNull CertificationItem> certifications,
        @Size(max = 50, message = "At most 50 achievements") List<@Valid @NotNull AchievementItem> achievements,
        @Valid Resume resume,
        @Size(max = 50, message = "At most 50 documents") List<@Valid @NotNull DocumentItem> documents,
        @Size(max = 50, message = "At most 50 evidence files") List<@Valid @NotNull EvidenceItem> evidence
) {

    /** Optional http(s) URL. */
    public static final String URL = "^$|^https?://\\S+$";
    /** Optional http(s) URL or a path served by this API (/api/files/...). */
    public static final String URL_OR_FILE = "^$|^https?://\\S+$|^/api/files/(download|view)/[A-Za-z0-9_-]+/[A-Za-z0-9._-]+$";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Personal(
            @NotBlank(message = "Full name is required")
            @Size(max = 120, message = "Full name cannot exceed 120 characters") String fullName,
            @Pattern(regexp = "^$|^[+0-9][0-9 ()-]{6,19}$", message = "Phone number format is invalid")
            @Size(max = 20, message = "Phone cannot exceed 20 characters") String phone,
            @Size(max = 255, message = "Address cannot exceed 255 characters") String address,
            @Size(max = 2000, message = "About cannot exceed 2000 characters") String about,
            @Size(max = 1000, message = "Avatar URL cannot exceed 1000 characters")
            @Pattern(regexp = URL_OR_FILE, message = "Avatar must be an http(s) URL or an uploaded file") String avatarUrl,
            @Size(max = 255, message = "GitHub URL cannot exceed 255 characters")
            @Pattern(regexp = URL, message = "GitHub URL must start with http:// or https://") String githubUrl,
            @Size(max = 255, message = "LinkedIn URL cannot exceed 255 characters")
            @Pattern(regexp = URL, message = "LinkedIn URL must start with http:// or https://") String linkedinUrl,
            @Size(max = 255, message = "Portfolio URL cannot exceed 255 characters")
            @Pattern(regexp = URL, message = "Portfolio URL must start with http:// or https://") String portfolioUrl
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Academic(
            @DecimalMin(value = "0.00", message = "CGPA must be between 0 and 10")
            @DecimalMax(value = "10.00", message = "CGPA must be between 0 and 10")
            @Digits(integer = 2, fraction = 2, message = "CGPA must have at most 2 decimal places") BigDecimal cgpa,
            @Min(value = 0, message = "Total backlogs cannot be negative")
            @Max(value = 100, message = "Total backlogs cannot exceed 100") Integer totalBacklogs,
            @Min(value = 0, message = "Active backlogs cannot be negative")
            @Max(value = 100, message = "Active backlogs cannot exceed 100") Integer activeBacklogs,
            @Min(value = 1, message = "Semester must be between 1 and 8")
            @Max(value = 8, message = "Semester must be between 1 and 8") Integer semester
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SkillItem(
            Long id,
            @NotBlank(message = "Skill name is required")
            @Size(max = 60, message = "Skill name cannot exceed 60 characters") String skillName,
            @Pattern(regexp = "^(BEGINNER|INTERMEDIATE|ADVANCED)?$", message = "Proficiency must be BEGINNER, INTERMEDIATE or ADVANCED")
            String proficiency
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EducationItem(
            Long id,
            @NotBlank(message = "Institution name is required")
            @Size(max = 150, message = "Institution name cannot exceed 150 characters") String institutionName,
            @NotBlank(message = "Degree is required")
            @Size(max = 120, message = "Degree cannot exceed 120 characters") String degree,
            @Size(max = 150, message = "Board or university cannot exceed 150 characters") String boardOrUniversity,
            @NotNull(message = "Start year is required")
            @Min(value = 1950, message = "Start year must be between 1950 and 2100")
            @Max(value = 2100, message = "Start year must be between 1950 and 2100") Integer startYear,
            @Min(value = 1950, message = "End year must be between 1950 and 2100")
            @Max(value = 2100, message = "End year must be between 1950 and 2100") Integer endYear,
            @Size(max = 30, message = "Grade cannot exceed 30 characters") String grade,
            Boolean isCurrent
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExperienceItem(
            Long id,
            @NotBlank(message = "Job role is required")
            @Size(max = 120, message = "Job role cannot exceed 120 characters") String jobRole,
            @NotBlank(message = "Company is required")
            @Size(max = 150, message = "Company cannot exceed 150 characters") String company,
            @Pattern(regexp = "^(INTERNSHIP|FULL_TIME|PART_TIME|FREELANCE)?$",
                    message = "Experience type must be INTERNSHIP, FULL_TIME, PART_TIME or FREELANCE") String experienceType,
            @Size(max = 120, message = "Location cannot exceed 120 characters") String location,
            @NotNull(message = "Start date is required") LocalDate startDate,
            LocalDate endDate,
            Boolean isCurrent,
            @Size(max = 4000, message = "Description cannot exceed 4000 characters") String description
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProjectItem(
            Long id,
            @NotBlank(message = "Project title is required")
            @Size(max = 150, message = "Project title cannot exceed 150 characters") String title,
            @Size(max = 4000, message = "Description cannot exceed 4000 characters") String description,
            @Size(max = 1000, message = "Live URL cannot exceed 1000 characters")
            @Pattern(regexp = URL, message = "Live URL must start with http:// or https://") String liveUrl,
            @Size(max = 1000, message = "Repository URL cannot exceed 1000 characters")
            @Pattern(regexp = URL, message = "Repository URL must start with http:// or https://") String repoUrl,
            @Size(max = 1000, message = "Media URL cannot exceed 1000 characters")
            @Pattern(regexp = URL_OR_FILE, message = "Media must be an http(s) URL or an uploaded file") String mediaUrl,
            @Size(max = 20, message = "At most 20 technologies per project")
            List<@NotBlank(message = "Technology cannot be blank")
                 @Size(max = 60, message = "Technology cannot exceed 60 characters") String> techStack
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CertificationItem(
            Long id,
            @NotBlank(message = "Certification name is required")
            @Size(max = 150, message = "Certification name cannot exceed 150 characters") String name,
            @Size(max = 150, message = "Issuer cannot exceed 150 characters") String issuer,
            LocalDate issueDate,
            LocalDate expiryDate,
            @Size(max = 100, message = "Credential ID cannot exceed 100 characters") String credentialId,
            @Size(max = 1000, message = "Credential URL cannot exceed 1000 characters")
            @Pattern(regexp = URL, message = "Credential URL must start with http:// or https://") String credentialUrl,
            @Size(max = 1000, message = "File URL cannot exceed 1000 characters")
            @Pattern(regexp = URL_OR_FILE, message = "File must be an uploaded file") String fileUrl
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AchievementItem(
            Long id,
            @NotBlank(message = "Achievement title is required")
            @Size(max = 150, message = "Achievement title cannot exceed 150 characters") String title,
            @Size(max = 2000, message = "Description cannot exceed 2000 characters") String description,
            LocalDate achievedOn,
            @Size(max = 1000, message = "File URL cannot exceed 1000 characters")
            @Pattern(regexp = URL_OR_FILE, message = "File must be an uploaded file") String fileUrl
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Resume(
            @Size(max = 1000, message = "Resume URL cannot exceed 1000 characters")
            @Pattern(regexp = URL_OR_FILE, message = "Resume must be an uploaded file") String resumeUrl,
            @Size(max = 255, message = "File name cannot exceed 255 characters") String fileName
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentItem(
            Long id,
            @NotBlank(message = "Document name is required")
            @Size(max = 150, message = "Document name cannot exceed 150 characters") String documentName,
            @NotBlank(message = "Document type is required")
            @Pattern(regexp = "^(MARKSHEET|CERTIFICATE|ID_PROOF|OTHER)$",
                    message = "Document type must be MARKSHEET, CERTIFICATE, ID_PROOF or OTHER") String documentType,
            @NotBlank(message = "Document file is required")
            @Size(max = 1000, message = "File URL cannot exceed 1000 characters") String fileUrl,
            @PositiveOrZero(message = "File size cannot be negative") Long fileSize
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EvidenceItem(
            @Size(max = 30, message = "Section cannot exceed 30 characters") String section,
            @NotBlank(message = "Evidence file is required")
            @Size(max = 1000, message = "File URL cannot exceed 1000 characters") String fileUrl,
            @Size(max = 255, message = "File name cannot exceed 255 characters") String fileName,
            @Size(max = 100, message = "Content type cannot exceed 100 characters") String contentType,
            @PositiveOrZero(message = "File size cannot be negative") Long size,
            @Size(max = 500, message = "Note cannot exceed 500 characters") String note
    ) {
    }
}
