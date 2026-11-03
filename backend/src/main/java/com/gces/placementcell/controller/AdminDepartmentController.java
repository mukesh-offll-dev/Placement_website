package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.DepartmentRequest;
import com.gces.placementcell.dto.request.DepartmentUpdateRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.DepartmentResponse;
import com.gces.placementcell.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Department management. SecurityConfig restricts /admin/** to ADMIN and PLACEMENT_OFFICER. */
@RestController
@RequestMapping("/admin/departments")
@RequiredArgsConstructor
public class AdminDepartmentController {

    private final DepartmentService departmentService;

    /** GET /api/admin/departments: every department, active or not, with its student count. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(departmentService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(@Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Department added", departmentService.create(request)));
    }

    /** PUT /api/admin/departments/{id}: rename, or switch on or off. */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable Long id, @Valid @RequestBody DepartmentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Department updated", departmentService.update(id, request)));
    }

    /** DELETE /api/admin/departments/{id}: only while nothing refers to it. */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Department deleted"));
    }
}
