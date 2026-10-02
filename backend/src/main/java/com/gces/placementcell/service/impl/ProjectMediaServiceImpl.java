package com.gces.placementcell.service.impl;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.response.FileUploadResponse;
import com.gces.placementcell.dto.response.ProjectMediaResponse;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.ProjectMediaService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Service
@Transactional
public class ProjectMediaServiceImpl implements ProjectMediaService {

    private final StudentProjectRepository projectRepository;
    private final FileStorageService fileStorageService;
    private final FileStorageProperties properties;

    public ProjectMediaServiceImpl(
            StudentProjectRepository projectRepository,
            FileStorageService fileStorageService,
            FileStorageProperties properties) {
        this.projectRepository = projectRepository;
        this.fileStorageService = fileStorageService;
        this.properties = properties;
    }

    @Override
    public FileUploadResponse uploadMediaStandalone(MultipartFile file) {
        String storedFileName = fileStorageService.storeFile(
                file,
                properties.getProjectMediaSubdir(),
                properties.getAllowedMediaExtensions(),
                properties.getMaxMediaSize()
        );

        String fileUrl = "/api/files/download/" + properties.getProjectMediaSubdir() + "/" + storedFileName;
        String contentType = fileStorageService.getContentType(storedFileName);

        return FileUploadResponse.builder()
                .fileName(storedFileName)
                .originalFileName(file.getOriginalFilename())
                .fileUrl(fileUrl)
                .downloadUrl(fileUrl)
                .contentType(contentType)
                .size(file.getSize())
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    @Override
    public ProjectMediaResponse uploadProjectMedia(Long projectId, MultipartFile file) {
        StudentProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));

        String storedFileName = fileStorageService.storeFile(
                file,
                properties.getProjectMediaSubdir(),
                properties.getAllowedMediaExtensions(),
                properties.getMaxMediaSize()
        );

        String mediaUrl = "/api/files/download/" + properties.getProjectMediaSubdir() + "/" + storedFileName;
        String downloadUrl = "/api/projects/" + projectId + "/media/download";
        String contentType = fileStorageService.getContentType(storedFileName);

        project.setMediaUrl(mediaUrl);
        projectRepository.save(project);

        return ProjectMediaResponse.builder()
                .projectId(projectId)
                .fileName(storedFileName)
                .mediaUrl(mediaUrl)
                .downloadUrl(downloadUrl)
                .contentType(contentType)
                .fileSize(file.getSize())
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectMediaResponse getProjectMedia(Long projectId) {
        StudentProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));

        if (project.getMediaUrl() == null || project.getMediaUrl().isBlank()) {
            throw new ResourceNotFoundException("No media found for project ID: " + projectId);
        }

        String mediaUrl = project.getMediaUrl();
        String fileName = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1);
        String contentType = fileStorageService.getContentType(fileName);

        return ProjectMediaResponse.builder()
                .projectId(projectId)
                .fileName(fileName)
                .mediaUrl(mediaUrl)
                .downloadUrl("/api/projects/" + projectId + "/media/download")
                .contentType(contentType)
                .uploadedAt(project.getUpdatedAt() != null ? project.getUpdatedAt() : project.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Resource downloadProjectMedia(Long projectId) {
        StudentProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));

        if (project.getMediaUrl() == null || project.getMediaUrl().isBlank()) {
            throw new ResourceNotFoundException("No media uploaded for project ID: " + projectId);
        }

        String fileName = project.getMediaUrl().substring(project.getMediaUrl().lastIndexOf('/') + 1);
        return fileStorageService.loadFileAsResource(properties.getProjectMediaSubdir(), fileName);
    }

    @Override
    public void deleteProjectMedia(Long projectId) {
        StudentProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));

        if (project.getMediaUrl() != null && !project.getMediaUrl().isBlank()) {
            String fileName = project.getMediaUrl().substring(project.getMediaUrl().lastIndexOf('/') + 1);
            fileStorageService.deleteFile(properties.getProjectMediaSubdir(), fileName);
            project.setMediaUrl(null);
            projectRepository.save(project);
        }
    }
}
