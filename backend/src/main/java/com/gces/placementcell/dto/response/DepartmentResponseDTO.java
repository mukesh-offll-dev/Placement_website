package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponseDTO {
    private Long id;
    private String name;
    private String code;
    private String degree;
    private String description;
    private Boolean isActive;
    private Long totalStudents;
    private Long placedStudents;
    private Double placementRate;
}

