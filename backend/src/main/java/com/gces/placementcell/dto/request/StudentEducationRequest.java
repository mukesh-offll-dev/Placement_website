package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One schooling or degree entry on a student's profile. */
public record StudentEducationRequest(

        @NotBlank(message = "Institution name is required")
        @Size(max = 150, message = "Institution name cannot exceed 150 characters")
        String institutionName,

        @NotBlank(message = "Degree is required")
        @Size(max = 120, message = "Degree cannot exceed 120 characters")
        String degree,

        @Size(max = 150, message = "Board or university cannot exceed 150 characters")
        String boardOrUniversity,

        @NotNull(message = "Start year is required")
        @Min(value = 1950, message = "Start year must be 1950 or later")
        @Max(value = 2100, message = "Start year is unrealistically far in the future")
        Short startYear,

        @Min(value = 1950, message = "End year must be 1950 or later")
        @Max(value = 2100, message = "End year is unrealistically far in the future")
        Short endYear,

        @Size(max = 30, message = "Grade cannot exceed 30 characters")
        String grade,

        Boolean isCurrent
) {

    @AssertTrue(message = "End year cannot be earlier than start year")
    public boolean isYearRangeValid() {
        return startYear == null || endYear == null || endYear >= startYear;
    }

    /**
     * is_current and end_year are two ways of saying the same thing, so they can drift
     * apart. Reject the contradiction at the edge rather than storing a row that claims
     * a course is both ongoing and finished.
     */
    @AssertTrue(message = "An ongoing course cannot have an end year")
    public boolean isCurrentFlagConsistent() {
        return !Boolean.TRUE.equals(isCurrent) || endYear == null;
    }
}
