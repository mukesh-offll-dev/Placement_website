package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentRequest {

    @Size(max = 20, message = "Roll number cannot exceed 20 characters")
    private String rollNo;

    @Size(max = 120, message = "Full name cannot exceed 120 characters")
    private String fullName;

    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    private String phone;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    private String about;
    private String avatarUrl;
    private String resumeUrl;

    @Size(max = 150, message = "College name cannot exceed 150 characters")
    private String college;

    @Size(max = 100, message = "Degree cannot exceed 100 characters")
    private String degree;

    @Size(max = 100, message = "Department cannot exceed 100 characters")
    private String department;

    @Size(max = 10, message = "Department code cannot exceed 10 characters")
    private String departmentCode;

    @Size(max = 20, message = "Batch cannot exceed 20 characters")
    private String batch;

    @Min(value = 1, message = "Semester must be between 1 and 10")
    @Max(value = 10, message = "Semester must be between 1 and 10")
    private Short semester;

    @DecimalMin(value = "0.00", message = "CGPA must be at least 0.00")
    @DecimalMax(value = "10.00", message = "CGPA cannot exceed 10.00")
    private BigDecimal cgpa;

    @Min(value = 0, message = "Total backlogs cannot be negative")
    private Integer totalBacklogs;

    @Min(value = 0, message = "Active backlogs cannot be negative")
    private Integer activeBacklogs;

    private PlacementStatus placementStatus;

    private Boolean isOpenToOpportunities;

    private Long placedCompanyId;

    @DecimalMin(value = "0.00", message = "Placed CTC cannot be negative")
    private BigDecimal placedCtc;

    private LocalDate placedOn;

    @Min(value = 0, message = "Profile completion percent must be between 0 and 100")
    @Max(value = 100, message = "Profile completion percent must be between 0 and 100")
    private Short profileCompletionPercent;

    private Boolean isActive;

    private AccountStatus accountStatus;

    private List<String> skills;
}
