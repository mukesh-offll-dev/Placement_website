package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.ExperienceType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** An internship or job entry on a student's profile. */
public record StudentExperienceRequest(

        @NotBlank(message = "Job role is required")
        @Size(max = 120, message = "Job role cannot exceed 120 characters")
        String jobRole,

        @NotBlank(message = "Company is required")
        @Size(max = 150, message = "Company cannot exceed 150 characters")
        String company,

        @NotNull(message = "Experience type is required")
        ExperienceType experienceType,

        @Size(max = 120, message = "Location cannot exceed 120 characters")
        String location,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        /** Null means the student is still in this role. */
        LocalDate endDate,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        Boolean isCurrent
) {

    @AssertTrue(message = "End date cannot be earlier than start date")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }

    /** A role the student still holds cannot also have an end date. */
    @AssertTrue(message = "A current role cannot have an end date")
    public boolean isCurrentFlagConsistent() {
        return !Boolean.TRUE.equals(isCurrent) || endDate == null;
    }
}
