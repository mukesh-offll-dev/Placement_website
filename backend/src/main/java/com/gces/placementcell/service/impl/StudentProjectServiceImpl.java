package com.gces.placementcell.service.impl;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProjectResponse;
import com.gces.placementcell.entity.ProjectTechStack;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.StudentProjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentProjectServiceImpl implements StudentProjectService {

    private static final Logger log = LoggerFactory.getLogger(StudentProjectServiceImpl.class);

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentProjectRepository studentProjectRepository;
    private final FileStorageService fileStorageService;
    private final FileStorageProperties properties;

    public StudentProjectServiceImpl(UserRepository userRepository,
                                     StudentProfileRepository studentProfileRepository,
                                     StudentProjectRepository studentProjectRepository) {
        this(userRepository, studentProfileRepository, studentProjectRepository, null, null);
    }

    @Autowired
    public StudentProjectServiceImpl(UserRepository userRepository,
                                     StudentProfileRepository studentProfileRepository,
                                     StudentProjectRepository studentProjectRepository,
                                     @Autowired(required = false) FileStorageService fileStorageService,
                                     @Autowired(required = false) FileStorageProperties properties) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentProjectRepository = studentProjectRepository;
        this.fileStorageService = fileStorageService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public StudentProjectResponse createProject(String email, StudentProjectRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);

        if (studentProjectRepository.existsByStudentIdAndTitle(profile.getId(), request.title().trim())) {
            throw new DuplicateResourceException("Project with title '" + request.title().trim() + "' already exists");
        }

        StudentProject project = StudentProject.builder()
                .studentProfile(profile)
                .title(request.title().trim())
                .description(request.description())
                .liveUrl(request.liveUrl())
                .repoUrl(request.repoUrl())
                .mediaUrl(request.mediaUrl())
                .build();

        if (request.techStack() != null) {
            Set<String> uniqueTechs = new LinkedHashSet<>();
            for (String tech : request.techStack()) {
                if (tech != null && !tech.isBlank()) {
                    uniqueTechs.add(tech.trim());
                }
            }
            for (String tech : uniqueTechs) {
                project.addTechnology(tech);
            }
        }

        project = studentProjectRepository.save(project);
        log.info("Created project '{}' (id: {}) for student {}", project.getTitle(), project.getId(), email);

        return StudentProjectResponse.from(project);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentProjectResponse> getAllProjects(String email) {
        StudentProfile profile = getStudentProfileByEmail(email);
        List<StudentProject> projects = studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(profile.getId());
        return projects.stream().map(StudentProjectResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentProjectResponse getProjectById(String email, Long projectId) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentProject project = studentProjectRepository.findByIdAndStudentId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        return StudentProjectResponse.from(project);
    }

    @Override
    @Transactional
    public StudentProjectResponse updateProject(String email, Long projectId, StudentProjectRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentProject project = studentProjectRepository.findByIdAndStudentId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        String newTitle = request.title().trim();
        if (!project.getTitle().equalsIgnoreCase(newTitle)) {
            Optional<StudentProject> conflict = studentProjectRepository.findByStudentIdAndTitle(profile.getId(), newTitle);
            if (conflict.isPresent() && !conflict.get().getId().equals(projectId)) {
                throw new DuplicateResourceException("Project with title '" + newTitle + "' already exists");
            }
        }

        if (project.getMediaUrl() != null && !project.getMediaUrl().equals(request.mediaUrl()) && fileStorageService != null && properties != null) {
            try {
                String oldFileName = project.getMediaUrl().substring(project.getMediaUrl().lastIndexOf('/') + 1);
                fileStorageService.deleteFile(properties.getProjectMediaSubdir(), oldFileName);
            } catch (Exception e) {
                log.warn("Could not delete previous media file: {}", e.getMessage());
            }
        }

        project.setTitle(newTitle);
        project.setDescription(request.description());
        project.setLiveUrl(request.liveUrl());
        project.setRepoUrl(request.repoUrl());
        project.setMediaUrl(request.mediaUrl());

        if (request.techStack() != null) {
            Set<String> newTechs = new LinkedHashSet<>();
            for (String tech : request.techStack()) {
                if (tech != null && !tech.isBlank()) {
                    newTechs.add(tech.trim());
                }
            }

            if (project.getTechStack() != null) {
                project.getTechStack().removeIf(pts -> !newTechs.contains(pts.getTechnology()));
                Set<String> existingTechs = project.getTechStack().stream()
                        .map(ProjectTechStack::getTechnology)
                        .collect(Collectors.toSet());
                for (String tech : newTechs) {
                    if (!existingTechs.contains(tech)) {
                        project.addTechnology(tech);
                    }
                }
            } else {
                project.setTechStack(new ArrayList<>());
                for (String tech : newTechs) {
                    project.addTechnology(tech);
                }
            }
        }

        project = studentProjectRepository.save(project);
        log.info("Updated project id: {} for student {}", projectId, email);

        return StudentProjectResponse.from(project);
    }

    @Override
    @Transactional
    public void deleteProject(String email, Long projectId) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentProject project = studentProjectRepository.findByIdAndStudentId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (project.getMediaUrl() != null && !project.getMediaUrl().isBlank() && fileStorageService != null && properties != null) {
            try {
                String mediaUrl = project.getMediaUrl();
                String fileName = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1);
                fileStorageService.deleteFile(properties.getProjectMediaSubdir(), fileName);
            } catch (Exception e) {
                log.warn("Could not delete project media file during project deletion: {}", e.getMessage());
            }
        }

        studentProjectRepository.delete(project);
        log.info("Deleted project id: {} for student {}", projectId, email);
    }

    private StudentProfile getStudentProfileByEmail(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found. Please create your profile first."));
    }
}
