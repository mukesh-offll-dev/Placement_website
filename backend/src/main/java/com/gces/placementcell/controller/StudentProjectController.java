package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.StudentProjectResponse;
import com.gces.placementcell.service.StudentProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated student project showcase management.
 * Path: /api/student/projects
 * Requires: ROLE_STUDENT (enforced by SecurityConfig /student/**)
 */
@RestController
@RequestMapping("/student/projects")
public class StudentProjectController {

    private final StudentProjectService studentProjectService;

    public StudentProjectController(StudentProjectService studentProjectService) {
        this.studentProjectService = studentProjectService;
    }

    /**
     * POST /api/student/projects
     * Creates a new project for the authenticated student.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentProjectResponse>> createProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StudentProjectRequest request) {
        StudentProjectResponse response = studentProjectService.createProject(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Project created successfully", response));
    }

    /**
     * GET /api/student/projects
     * Retrieves all projects belonging to the authenticated student.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentProjectResponse>>> getAllProjects(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentProjectResponse> response = studentProjectService.getAllProjects(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/student/projects/{projectId}
     * Retrieves a specific project belonging to the authenticated student.
     */
    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<StudentProjectResponse>> getProjectById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        StudentProjectResponse response = studentProjectService.getProjectById(userDetails.getUsername(), projectId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * PUT /api/student/projects/{projectId}
     * Updates an existing project belonging to the authenticated student.
     */
    @PutMapping("/{projectId}")
    public ResponseEntity<ApiResponse<StudentProjectResponse>> updateProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId,
            @Valid @RequestBody StudentProjectRequest request) {
        StudentProjectResponse response = studentProjectService.updateProject(userDetails.getUsername(), projectId, request);
        return ResponseEntity.ok(ApiResponse.success("Project updated successfully", response));
    }

    /**
     * DELETE /api/student/projects/{projectId}
     * Deletes a project belonging to the authenticated student.
     */
    @DeleteMapping("/{projectId}")
    public ResponseEntity<ApiResponse<Void>> deleteProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        studentProjectService.deleteProject(userDetails.getUsername(), projectId);
        return ResponseEntity.ok(ApiResponse.success("Project deleted successfully"));
    }
}
