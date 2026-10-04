package com.gces.placementcell.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentStatDto {
    private String department;
    private long totalStudents;
    private long placedStudents;
    private double placementRate;
}
