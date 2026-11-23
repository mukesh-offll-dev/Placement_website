package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.FacultyProfile;

public record DepartmentResponse(
        Long id,
        String code,
        String name,
        Boolean isActive,
        /** Current students in this department; a department with students cannot be deleted. */
        long studentCount,
        /** The department's faculty advisor, or null when none is assigned. */
        FacultyAdvisor facultyAdvisor
) {

    public record FacultyAdvisor(Long id, String fullName, String email, boolean active) {

        public static FacultyAdvisor from(FacultyProfile faculty) {
            if (faculty == null) {
                return null;
            }
            return new FacultyAdvisor(faculty.getId(), faculty.getFullName(), faculty.getUser().getEmail(),
                    Boolean.TRUE.equals(faculty.getUser().getIsActive()));
        }
    }

    public static DepartmentResponse from(Department department, long studentCount) {
        return from(department, studentCount, null);
    }

    public static DepartmentResponse from(Department department, long studentCount, FacultyProfile advisor) {
        return new DepartmentResponse(department.getId(), department.getCode(), department.getName(),
                department.getIsActive(), studentCount, FacultyAdvisor.from(advisor));
    }
}
