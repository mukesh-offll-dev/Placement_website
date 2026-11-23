package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.ArchiveBatchRequest;
import com.gces.placementcell.dto.request.BulkProvisionStudentsRequest;
import com.gces.placementcell.dto.request.BulkStudentActionRequest;
import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.ProvisionStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.ArchivePreviewResponse;
import com.gces.placementcell.dto.response.BulkActionResult;
import com.gces.placementcell.dto.response.BulkProvisionResult;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;

import java.math.BigDecimal;
import java.util.List;

/**
 * Student management for admins, placement officers and (scoped to their department) faculty
 * advisors. Every scoped method takes a {@link StudentScope} built from the authenticated user; a
 * student outside the scope is reported as not found. The scope-less methods act on every department.
 */
public interface AdminStudentService {

    /** Filters shared by the student list and the "select all matching" id list. */
    record StudentListFilter(
            String search,
            String department,
            PlacementStatus status,
            BigDecimal minCgpa,
            /** ACTIVE, DISABLED, ARCHIVED or ALL; null = ACTIVE and DISABLED (archived hidden). */
            String lifecycle,
            ProfileVerificationStatus verificationStatus,
            String batch) {
    }

    default PageResponse<StudentSummaryDto> getStudents(
            String search, String department, PlacementStatus status, BigDecimal minCgpa,
            int page, int size, String sortBy, String sortDir) {
        return getStudents(new StudentListFilter(search, department, status, minCgpa, null, null, null),
                page, size, sortBy, sortDir, StudentScope.officer());
    }

    PageResponse<StudentSummaryDto> getStudents(StudentListFilter filter, int page, int size,
                                                String sortBy, String sortDir, StudentScope scope);

    /** Ids of every student matching the filter (at most 5000). */
    List<Long> getStudentIds(StudentListFilter filter, StudentScope scope);

    default StudentDetailDto getStudentById(Long id) {
        return getStudentById(id, StudentScope.officer());
    }

    StudentDetailDto getStudentById(Long id, StudentScope scope);

    StudentDetailDto createStudent(CreateStudentRequest request);

    default StudentDetailDto updateStudent(Long id, UpdateStudentRequest request) {
        return updateStudent(id, request, StudentScope.officer());
    }

    StudentDetailDto updateStudent(Long id, UpdateStudentRequest request, StudentScope scope);

    default void deleteStudent(Long id) {
        deleteStudent(id, StudentScope.officer());
    }

    void deleteStudent(Long id, StudentScope scope);

    /** Adds one student with the register number as their initial password. */
    default StudentSummaryDto provisionStudent(ProvisionStudentRequest request) {
        return provisionStudent(request, StudentScope.officer());
    }

    /** A department-scoped caller always provisions into their own department. */
    StudentSummaryDto provisionStudent(ProvisionStudentRequest request, StudentScope scope);

    /** Adds every student in a register number range, skipping ones that already exist. */
    default BulkProvisionResult provisionStudents(BulkProvisionStudentsRequest request) {
        return provisionStudents(request, StudentScope.officer());
    }

    BulkProvisionResult provisionStudents(BulkProvisionStudentsRequest request, StudentScope scope);

    /** Deactivates (lifecycle DISABLED, login blocked) or reactivates (ACTIVE) a student. */
    default StudentSummaryDto setStudentActive(Long id, boolean active) {
        return setStudentActive(id, active, StudentScope.officer());
    }

    StudentSummaryDto setStudentActive(Long id, boolean active, StudentScope scope);

    /** Sets the password back to the register number and forces a change at next login. */
    default void resetStudentPassword(Long id) {
        resetStudentPassword(id, StudentScope.officer());
    }

    void resetStudentPassword(Long id, StudentScope scope);

    /** DELETE / DISABLE / ENABLE / ARCHIVE / RESTORE many students in one transaction. */
    BulkActionResult bulkAction(BulkStudentActionRequest request, StudentScope scope);

    /** How many ACTIVE/DISABLED live students a batch archive would affect. */
    ArchivePreviewResponse previewBatchArchive(String batch, String departmentCode);

    BulkActionResult archiveBatch(ArchiveBatchRequest request, StudentScope scope);

    byte[] exportStudentsCsv(String search, String department, PlacementStatus status);
}
