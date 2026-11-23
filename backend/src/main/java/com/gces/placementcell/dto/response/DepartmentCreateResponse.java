package com.gces.placementcell.dto.response;

/** POST /admin/departments: the new department, plus its advisor account when one was requested. */
public record DepartmentCreateResponse(DepartmentResponse department, FacultyDto faculty, String temporaryPassword) {
}