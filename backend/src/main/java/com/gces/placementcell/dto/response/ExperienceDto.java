package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.ExperienceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExperienceDto {
    private Long id;
    private String jobRole;
    private String company;
    private ExperienceType experienceType;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isCurrent;
    private String description;
}
