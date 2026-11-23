package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.FileUploadResponse;
import com.gces.placementcell.dto.response.ProjectMediaResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Project media. Every project-scoped operation takes the signed-in student's email and only
 * touches that student's own projects; another student's project id answers 404.
 */
public interface ProjectMediaService {

    /**
     * Uploads media standalone before project creation or for general project use.
     *
     * @param file Media file (JPG, JPEG, PNG, WEBP, PDF)
     * @return File upload response containing media URL
     */
    FileUploadResponse uploadMediaStandalone(MultipartFile file);

    /**
     * Uploads media and associates it with a specific project.
     *
     * @param projectId ID of the project
     * @param file      Media file
     * @return Project media response
     */
    ProjectMediaResponse uploadProjectMedia(String studentEmail, Long projectId, MultipartFile file);

    /**
     * Gets media metadata for a specific project.
     *
     * @param projectId ID of the project
     * @return Project media response
     */
    ProjectMediaResponse getProjectMedia(String studentEmail, Long projectId);

    /**
     * Loads the project media as a downloadable resource.
     *
     * @param projectId ID of the project
     * @return Spring Resource
     */
    Resource downloadProjectMedia(String studentEmail, Long projectId);

    /**
     * Deletes media associated with a project.
     *
     * @param projectId ID of the project
     */
    void deleteProjectMedia(String studentEmail, Long projectId);
}
