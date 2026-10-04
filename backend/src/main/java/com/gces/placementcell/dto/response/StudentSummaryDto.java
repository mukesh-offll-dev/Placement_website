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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSummaryDto {

    private Long id;
    private Long userId;
    private String rollNo;
    private String fullName;
    private String email;
    private String phone;
    private String department;
    private String departmentCode;
    private String degree;
    private String batch;
    private Short semester;
    private BigDecimal cgpa;
    private Integer totalBacklogs;
    private Integer activeBacklogs;
    private PlacementStatus placementStatus;
    private Boolean isOpenToOpportunities;
    private Long placedCompanyId;
    private String placedCompanyName;
    private BigDecimal placedCtc;
    private LocalDate placedOn;
    private Short profileCompletionPercent;
    private AccountStatus accountStatus;
    private Boolean isActive;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
