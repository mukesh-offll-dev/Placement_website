package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentEducation;

import java.time.LocalDateTime;

/** One schooling or degree entry on a student's profile. */
public record StudentEducationResponse(
        Long id,
        String institutionName,
        String degree,
        String boardOrUniversity,
        Short startYear,
        Short endYear,
        String grade,
        Boolean isCurrent,
        LocalDateTime createdAt
) {

    public static StudentEducationResponse from(StudentEducation education) {
        if (education == null) {
            return null;
        }
        return new StudentEducationResponse(
                education.getId(),
                education.getInstitutionName(),
                education.getDegree(),
                education.getBoardOrUniversity(),
                education.getStartYear(),
                education.getEndYear(),
                education.getGrade(),
                education.getIsCurrent(),
                education.getCreatedAt()
        );
    }
}
