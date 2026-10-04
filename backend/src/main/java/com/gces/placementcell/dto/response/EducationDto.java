package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EducationDto {
    private Long id;
    private String institutionName;
    private String degree;
    private String boardOrUniversity;
    private Short startYear;
    private Short endYear;
    private String grade;
    private Boolean isCurrent;
}
