package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.CreateFacultyRequest;
import com.gces.placementcell.dto.request.UpdateFacultyRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.FacultyCredentialsResponse;
import com.gces.placementcell.dto.response.FacultyDto;
import com.gces.placementcell.service.FacultyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Faculty advisor accounts. ADMIN only (placement officers get 403). */
@RestController
@RequestMapping("/admin/faculty")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminFacultyController {

    private final FacultyService facultyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FacultyDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(facultyService.list()));
    }

    /** The temporary password is in this response only; it is never shown again. */
    @PostMapping
    public ResponseEntity<ApiResponse<FacultyCredentialsResponse>> create(@Valid @RequestBody CreateFacultyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Faculty account created", facultyService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FacultyDto>> update(@PathVariable Long id, @Valid @RequestBody UpdateFacultyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Faculty account updated", facultyService.update(id, request)));
    }

    @PatchMapping("/{id}/disable")
    public ResponseEntity<ApiResponse<FacultyDto>> disable(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Faculty account disabled", facultyService.setEnabled(id, false)));
    }

    @PatchMapping("/{id}/enable")
    public ResponseEntity<ApiResponse<FacultyDto>> enable(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Faculty account enabled", facultyService.setEnabled(id, true)));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<FacultyCredentialsResponse>> resetPassword(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Temporary password issued", facultyService.resetPassword(id)));
    }
}
