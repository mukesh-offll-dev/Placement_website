package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProjectResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.StudentProjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StudentProjectServiceImpl implements StudentProjectService {

    private static final Logger log = LoggerFactory.getLogger(StudentProjectServiceImpl.class);

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentProjectRepository studentProjectRepository;

    public StudentProjectServiceImpl(UserRepository userRepository,
                                     StudentProfileRepository studentProfileRepository,
                                     StudentProjectRepository studentProjectRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentProjectRepository = studentProjectRepository;
    }

    @Override
    @Transactional
    public StudentProjectResponse createProject(String email, StudentProjectRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);

        if (studentProjectRepository.existsByStudentProfileIdAndTitle(profile.getId(), request.title().trim())) {
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
            for (String tech : request.techStack()) {
                if (tech != null && !tech.isBlank()) {
                    project.addTechnology(tech.trim());
                }
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
        List<StudentProject> projects = studentProjectRepository.findByStudentProfileIdOrderByCreatedAtDesc(profile.getId());
        return projects.stream().map(StudentProjectResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentProjectResponse getProjectById(String email, Long projectId) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentProject project = studentProjectRepository.findByIdAndStudentProfileId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        return StudentProjectResponse.from(project);
    }

    @Override
    @Transactional
    public StudentProjectResponse updateProject(String email, Long projectId, StudentProjectRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentProject project = studentProjectRepository.findByIdAndStudentProfileId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        String newTitle = request.title().trim();
        if (!project.getTitle().equalsIgnoreCase(newTitle)) {
            Optional<StudentProject> conflict = studentProjectRepository.findByStudentProfileIdAndTitle(profile.getId(), newTitle);
            if (conflict.isPresent() && !conflict.get().getId().equals(projectId)) {
                throw new DuplicateResourceException("Project with title '" + newTitle + "' already exists");
            }
        }

        project.setTitle(newTitle);
        project.setDescription(request.description());
        project.setLiveUrl(request.liveUrl());
        project.setRepoUrl(request.repoUrl());
        project.setMediaUrl(request.mediaUrl());

        if (request.techStack() != null) {
            if (project.getTechStack() == null) {
                project.setTechStack(new java.util.ArrayList<>());
            } else {
                project.getTechStack().clear();
            }
            for (String tech : request.techStack()) {
                if (tech != null && !tech.isBlank()) {
                    project.addTechnology(tech.trim());
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
        StudentProject project = studentProjectRepository.findByIdAndStudentProfileId(projectId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

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
