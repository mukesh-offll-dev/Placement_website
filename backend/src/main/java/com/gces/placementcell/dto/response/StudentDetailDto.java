package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDetailDto {

    private Long id;
    private Long userId;
    private String rollNo;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String about;
    private String avatarUrl;
    private String resumeUrl;

    // Academic Details
    private String college;
    private String degree;
    private String department;
    private String departmentCode;
    private String batch;
    private Short semester;
    private BigDecimal cgpa;
    private Integer totalBacklogs;
    private Integer activeBacklogs;

    // Placement Details
    private PlacementStatus placementStatus;
    private Boolean isOpenToOpportunities;
    private Long placedCompanyId;
    private String placedCompanyName;
    private BigDecimal placedCtc;
    private LocalDate placedOn;
    private Short profileCompletionPercent;

    // Account Details
    private AccountStatus accountStatus;
    private Boolean isActive;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Related Entities
    private List<SkillDto> skills;
    private List<EducationDto> education;
    private List<ExperienceDto> experience;
    private List<ProjectDto> projects;
    private List<ApplicationSummaryDto> applications;
    private long totalApplications;
    private long shortlistedCount;

    // Verified links and sections
    private String githubUrl;
    private String linkedinUrl;
    private String portfolioUrl;
    private List<ProfileData.CertificationItem> certifications;
    private List<ProfileData.AchievementItem> achievements;
    private List<ProfileData.DocumentItem> documents;

    // Lifecycle and verification
    private LifecycleStatus lifecycleStatus;
    private LocalDateTime archivedAt;
    private String archiveReason;
    private ProfileVerificationStatus profileVerificationStatus;
    private LocalDateTime profileVerifiedAt;
    /** Id of the student's PENDING verification request, or null. */
    private Long pendingVersionId;
}
