package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Department;

public record DepartmentResponse(
        Long id,
        String code,
        String name,
        Boolean isActive,
        /** Current students in this department; a department with students cannot be deleted. */
        long studentCount
) {
    public static DepartmentResponse from(Department department, long studentCount) {
        return new DepartmentResponse(department.getId(), department.getCode(), department.getName(),
                department.getIsActive(), studentCount);
    }
}
