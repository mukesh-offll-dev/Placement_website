package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
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
}
