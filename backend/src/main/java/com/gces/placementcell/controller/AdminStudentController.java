package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.service.AdminStudentService;
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
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students_report.csv\"");
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
     * DELETE /api/admin/students/{id}
     * Soft-delete/deactivate student according to project design.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable Long id) {
        adminStudentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success("Student deactivated successfully"));
    }
}
