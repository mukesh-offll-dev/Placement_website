package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.BulkProvisionStudentsRequest;
import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.ProvisionStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.BulkProvisionResult;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.enums.PlacementStatus;

import java.math.BigDecimal;

public interface AdminStudentService {

    PageResponse<StudentSummaryDto> getStudents(
            String search,
            String department,
            PlacementStatus status,
            BigDecimal minCgpa,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    StudentDetailDto getStudentById(Long id);

    StudentDetailDto createStudent(CreateStudentRequest request);

    StudentDetailDto updateStudent(Long id, UpdateStudentRequest request);

    void deleteStudent(Long id);

    /** Adds one student with the register number as their initial password. */
    StudentSummaryDto provisionStudent(ProvisionStudentRequest request);

    /** Adds every student in a register number range, skipping ones that already exist. */
    BulkProvisionResult provisionStudents(BulkProvisionStudentsRequest request);

    /** Deactivates (blocks login, reversible) or reactivates a student account. */
    StudentSummaryDto setStudentActive(Long id, boolean active);

    /** Sets the password back to the register number and forces a change at next login. */
    void resetStudentPassword(Long id);

    byte[] exportStudentsCsv(String search, String department, PlacementStatus status);
}
