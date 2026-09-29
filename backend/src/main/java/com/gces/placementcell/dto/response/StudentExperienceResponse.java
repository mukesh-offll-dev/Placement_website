package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentExperience;
import com.gces.placementcell.entity.enums.ExperienceType;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** An internship or job entry on a student's profile. */
public record StudentExperienceResponse(
        Long id,
        String jobRole,
        String company,
        ExperienceType experienceType,
        String location,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isCurrent,
        String description,
        LocalDateTime createdAt
) {

    public static StudentExperienceResponse from(StudentExperience experience) {
        if (experience == null) {
            return null;
        }
        return new StudentExperienceResponse(
                experience.getId(),
                experience.getJobRole(),
                experience.getCompany(),
                experience.getExperienceType(),
                experience.getLocation(),
                experience.getStartDate(),
                experience.getEndDate(),
                experience.getIsCurrent(),
                experience.getDescription(),
                experience.getCreatedAt()
        );
    }
}
