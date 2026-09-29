package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new Course.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCourseRequestDTO {

    @NotBlank(message = "Course code is required")
    @Size(max = 50, message = "Course code cannot exceed 50 characters")
    private String courseCode;

    @NotBlank(message = "Course name is required")
    @Size(max = 150, message = "Course name cannot exceed 150 characters")
    private String courseName;

    @Size(max = 100, message = "Department cannot exceed 100 characters")
    private String department;

    @Size(max = 60, message = "Degree cannot exceed 60 characters")
    private String degree;

    @Min(value = 1, message = "Duration must be at least 1 year")
    @Max(value = 10, message = "Duration cannot exceed 10 years")
    private Integer durationYears;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @Builder.Default
    private Boolean isActive = true;
}
