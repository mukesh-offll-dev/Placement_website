package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProjectResponse;

import java.util.List;

/**
 * Service interface for student project showcase management.
 */
public interface StudentProjectService {

    /**
     * Creates a new project showcase entry for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param request Project creation request.
     * @return Created project details.
     */
    StudentProjectResponse createProject(String email, StudentProjectRequest request);

    /**
     * Retrieves all projects belonging to the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @return List of student projects.
     */
    List<StudentProjectResponse> getAllProjects(String email);

    /**
     * Retrieves a specific project by id for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param projectId ID of the project.
     * @return Project details.
     */
    StudentProjectResponse getProjectById(String email, Long projectId);

    /**
     * Updates an existing project belonging to the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param projectId ID of the project to update.
     * @param request Updated project details.
     * @return Updated project details.
     */
    StudentProjectResponse updateProject(String email, Long projectId, StudentProjectRequest request);

    /**
     * Deletes a project belonging to the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param projectId ID of the project to delete.
     */
    void deleteProject(String email, Long projectId);
}
