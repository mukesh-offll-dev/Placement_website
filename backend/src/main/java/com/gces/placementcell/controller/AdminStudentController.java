package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.BulkProvisionStudentsRequest;
import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.ProvisionStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.BulkProvisionResult;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.service.AdminStudentService;
import com.gces.placementcell.service.ProfileReminderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping({"/admin/students", "/api/admin/students"})
@RequiredArgsConstructor
public class AdminStudentController {

    private final AdminStudentService adminStudentService;
    private final ProfileReminderService profileReminderService;

    /**
     * GET /api/admin/students
     * Fetch paginated students with search and filter capabilities.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StudentSummaryDto>>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) PlacementStatus status,
            @RequestParam(required = false) BigDecimal minCgpa,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        PageResponse<StudentSummaryDto> response = adminStudentService.getStudents(
                search, department, status, minCgpa, page, size, sortBy, sortDir
        );

        return ResponseEntity.ok(ApiResponse.success("Students retrieved successfully", response));
    }

    /**
     * GET /api/admin/students/export
     * Export student records in CSV format.
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) PlacementStatus status) {

        byte[] csvBytes = adminStudentService.exportStudentsCsv(search, department, status);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        // Dated, so successive exports do not overwrite each other in Downloads.
        String filename = "placement_report_" + java.time.LocalDate.now() + ".csv";
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        // Lets the browser read the filename from a cross-origin response.
        headers.set(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION);
        headers.setContentLength(csvBytes.length);

        return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
    }

    /**
     * GET /api/admin/students/{id}
     * Retrieve complete student profile with academic, skills, experience, and project details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDetailDto>> getStudentById(@PathVariable Long id) {
        StudentDetailDto detail = adminStudentService.getStudentById(id);
        return ResponseEntity.ok(ApiResponse.success("Student details retrieved successfully", detail));
    }

    /**
     * POST /api/admin/students
     * Create a new student record and associated user login.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentDetailDto>> createStudent(
            @Valid @RequestBody CreateStudentRequest request) {

        StudentDetailDto created = adminStudentService.createStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student created successfully", created));
    }

    /**
     * PUT /api/admin/students/{id}
     * Update an existing student's details.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDetailDto>> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStudentRequest request) {

        StudentDetailDto updated = adminStudentService.updateStudent(id, request);
        return ResponseEntity.ok(ApiResponse.success("Student updated successfully", updated));
    }

    /**
     * POST /api/admin/students/provision
     * Adds one student from a register number, department and year. The initial password is the
     * register number; the student sets their own details at first login.
     */
    @PostMapping("/provision")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> provisionStudent(
            @Valid @RequestBody ProvisionStudentRequest request) {
        StudentSummaryDto created = adminStudentService.provisionStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student added. Their initial password is their register number.", created));
    }

    /**
     * POST /api/admin/students/provision/bulk
     * Adds a register number range; numbers that already exist are skipped.
     */
    @PostMapping("/provision/bulk")
    public ResponseEntity<ApiResponse<BulkProvisionResult>> provisionStudents(
            @Valid @RequestBody BulkProvisionStudentsRequest request) {
        BulkProvisionResult result = adminStudentService.provisionStudents(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(result.created() + " student(s) added, " + result.skipped() + " skipped.", result));
    }

    /** PATCH /api/admin/students/{id}/deactivate: blocks login until reactivated. */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> deactivateStudent(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Student deactivated", adminStudentService.setStudentActive(id, false)));
    }

    /** PATCH /api/admin/students/{id}/reactivate */
    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> reactivateStudent(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Student reactivated", adminStudentService.setStudentActive(id, true)));
    }

    /** POST /api/admin/students/{id}/reset-password: back to the register number, change forced at next login. */
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@PathVariable Long id) {
        adminStudentService.resetStudentPassword(id);
        return ResponseEntity.ok(ApiResponse.success("Password reset to the register number. The student must change it at next login."));
    }

    /** POST /api/admin/students/profile-reminders: sends the "complete your profile" reminder now. */
    @PostMapping("/profile-reminders")
    public ResponseEntity<ApiResponse<Integer>> sendProfileReminders() {
        int reminded = profileReminderService.sendReminders();
        return ResponseEntity.ok(ApiResponse.success(reminded + " student(s) reminded", reminded));
    }

    /**
     * DELETE /api/admin/students/{id}
     * Soft-delete the student: the account is removed from lists and can no longer sign in, but
     * their applications and history are kept.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable Long id) {
        adminStudentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success("Student deactivated successfully"));
    }
}
