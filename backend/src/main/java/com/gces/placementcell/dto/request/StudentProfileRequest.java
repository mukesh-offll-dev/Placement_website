package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Fields a student may edit on their own profile.
 *
 * Placement outcome columns (placed_company, placed_ctc, placed_on, placement_status)
 * are deliberately absent: those are set by the placement cell, not self-reported, so
 * exposing them here would let a student mark themselves placed.
 */
public record StudentProfileRequest(

        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name cannot exceed 120 characters")
        String fullName,

        @Size(max = 20, message = "Roll number cannot exceed 20 characters")
        String rollNo,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @Pattern(regexp = "^$|^[+0-9][0-9 ()-]{6,19}$", message = "Phone number format is invalid")
        @Size(max = 20, message = "Phone cannot exceed 20 characters")
        String phone,

        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @Size(max = 2000, message = "About cannot exceed 2000 characters")
        String about,

        @Size(max = 1000, message = "Avatar URL cannot exceed 1000 characters")
        String avatarUrl,

        @Size(max = 1000, message = "Resume URL cannot exceed 1000 characters")
        String resumeUrl,

        @Size(max = 150, message = "College cannot exceed 150 characters")
        String college,

        @Size(max = 100, message = "Degree cannot exceed 100 characters")
        String degree,

        @Size(max = 100, message = "Department cannot exceed 100 characters")
        String department,

        @Size(max = 10, message = "Department code cannot exceed 10 characters")
        String departmentCode,

        @Size(max = 20, message = "Batch cannot exceed 20 characters")
        String batch,

        @Min(value = 1, message = "Semester must be at least 1")
        @Max(value = 10, message = "Semester cannot exceed 10")
        Short semester,

        @DecimalMin(value = "0.00", message = "CGPA cannot be negative")
        @DecimalMax(value = "10.00", message = "CGPA cannot exceed 10.00")
        @Digits(integer = 2, fraction = 2, message = "CGPA must have at most 2 decimal places")
        BigDecimal cgpa,

        @Min(value = 0, message = "Total backlogs cannot be negative")
        Integer totalBacklogs,

        @Min(value = 0, message = "Active backlogs cannot be negative")
        Integer activeBacklogs,

        Boolean isOpenToOpportunities
) {
    public StudentProfileRequest(
            String fullName,
            String email,
            String phone,
            String address,
            String about,
            String avatarUrl,
            String resumeUrl,
            String college,
            String degree,
            String department,
            String departmentCode,
            String batch,
            Short semester,
            BigDecimal cgpa,
            Integer totalBacklogs,
            Integer activeBacklogs,
            Boolean isOpenToOpportunities
    ) {
        this(fullName, null, email, phone, address, about, avatarUrl, resumeUrl, college, degree, department, departmentCode, batch, semester, cgpa, totalBacklogs, activeBacklogs, isOpenToOpportunities);
    }
}
