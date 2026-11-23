package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Department;

/** {id, code, name} of a department. */
public record DepartmentRef(Long id, String code, String name) {

    public static DepartmentRef from(Department department) {
        return department == null ? null : new DepartmentRef(department.getId(), department.getCode(), department.getName());
    }
}