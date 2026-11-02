package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.entity.ProjectTechStack;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.*;
import com.gces.placementcell.service.StudentProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentProfileServiceImpl implements StudentProfileService {

    private static final Logger log = LoggerFactory.getLogger(StudentProfileServiceImpl.class);

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final StudentEducationRepository studentEducationRepository;
    private final StudentExperienceRepository studentExperienceRepository;
    private final StudentProjectRepository studentProjectRepository;

    public StudentProfileServiceImpl(UserRepository userRepository,
                                     StudentProfileRepository studentProfileRepository,
                                     StudentSkillRepository studentSkillRepository,
                                     StudentEducationRepository studentEducationRepository,
                                     StudentExperienceRepository studentExperienceRepository,
                                     StudentProjectRepository studentProjectRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.studentSkillRepository = studentSkillRepository;
        this.studentEducationRepository = studentEducationRepository;
        this.studentExperienceRepository = studentExperienceRepository;
        this.studentProjectRepository = studentProjectRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public StudentProfileResponse getProfile(String email) {
        User user = findUserByEmail(email);

        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + email));

        return buildFullProfileResponse(profile);
    }

    @Override
    @Transactional
    public StudentProfileResponse createProfile(String email, StudentProfileRequest request) {
        User user = findUserByEmail(email);

        if (studentProfileRepository.existsByUserId(user.getId())) {
            throw new DuplicateResourceException("Profile already exists for this student. Use PUT /api/student/profile to update.");
        }

        String rollNo = (request.rollNo() != null && !request.rollNo().isBlank()) ? request.rollNo().trim() : null;
        if (rollNo != null && studentProfileRepository.existsByRollNo(rollNo)) {
            throw new DuplicateResourceException("Roll number already registered: " + rollNo);
        }

        StudentProfile profile = StudentProfile.builder()
                .user(user)
                .rollNo(rollNo)
                .fullName(request.fullName())
                .email(user.getEmail())
                .phone(request.phone())
                .address(request.address())
                .about(request.about())
                .avatarUrl(request.avatarUrl())
                .resumeUrl(request.resumeUrl())
                .college(request.college())
                .degree(request.degree())
                .department(request.department())
                .departmentCode(request.departmentCode())
                .batch(request.batch())
                .semester(request.semester() != null ? request.semester().intValue() : null)
                .cgpa(request.cgpa())
                .totalBacklogs(request.totalBacklogs() != null ? request.totalBacklogs() : 0)
                .activeBacklogs(request.activeBacklogs() != null ? request.activeBacklogs() : 0)
                .isOpenToOpportunities(request.isOpenToOpportunities() != null ? request.isOpenToOpportunities() : true)
                .placementStatus(PlacementStatus.PENDING)
                .build();

        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        profile = studentProfileRepository.save(profile);
        log.info("Created new student profile for user: {}", email);

        boolean hasChildren = false;
        if (request.education() != null && !request.education().isEmpty()) {
            saveEducationRecords(profile, request.education());
            hasChildren = true;
        }

        if (request.projects() != null && !request.projects().isEmpty()) {
            saveProjectRecords(profile, request.projects());
            hasChildren = true;
        }

        if (hasChildren) {
            return buildFullProfileResponse(profile);
        }

        return StudentProfileResponse.from(profile);
    }

    @Override
    @Transactional
    public StudentProfileResponse updateProfile(String email, StudentProfileRequest request) {
        User user = findUserByEmail(email);

        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + email));

        if (request.rollNo() != null && !request.rollNo().isBlank()) {
            String newRollNo = request.rollNo().trim();
            if (profile.getRollNo() == null || !profile.getRollNo().equalsIgnoreCase(newRollNo)) {
                if (studentProfileRepository.existsByRollNo(newRollNo)) {
                    throw new DuplicateResourceException("Roll number already registered: " + newRollNo);
                }
                profile.setRollNo(newRollNo);
            }
        }

        profile.setFullName(request.fullName());
        if (request.phone() != null) profile.setPhone(request.phone());
        if (request.address() != null) profile.setAddress(request.address());
        if (request.about() != null) profile.setAbout(request.about());
        if (request.avatarUrl() != null) profile.setAvatarUrl(request.avatarUrl());
        if (request.resumeUrl() != null) profile.setResumeUrl(request.resumeUrl());
        if (request.college() != null) profile.setCollege(request.college());
        if (request.degree() != null) profile.setDegree(request.degree());
        if (request.department() != null) profile.setDepartment(request.department());
        if (request.departmentCode() != null) profile.setDepartmentCode(request.departmentCode());
        if (request.batch() != null) profile.setBatch(request.batch());
        if (request.semester() != null) profile.setSemester(request.semester());
        if (request.cgpa() != null) profile.setCgpa(request.cgpa());
        if (request.totalBacklogs() != null) profile.setTotalBacklogs(request.totalBacklogs());
        if (request.activeBacklogs() != null) profile.setActiveBacklogs(request.activeBacklogs());
        if (request.isOpenToOpportunities() != null) profile.setIsOpenToOpportunities(request.isOpenToOpportunities());

        if (request.education() != null) {
            updateEducationRecords(profile, request.education());
        }

        if (request.projects() != null) {
            updateProjectRecords(profile, request.projects());
        }

        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        profile = studentProfileRepository.save(profile);
        log.info("Updated student profile for user: {}", email);

        return buildFullProfileResponse(profile);
    }

    private void saveEducationRecords(StudentProfile profile, List<StudentEducationRequest> educationRequests) {
        if (educationRequests == null || educationRequests.isEmpty()) {
            return;
        }
        for (StudentEducationRequest req : educationRequests) {
            if (req != null && req.institutionName() != null && !req.institutionName().isBlank()) {
                StudentEducation edu = StudentEducation.builder()
                        .studentProfile(profile)
                        .institutionName(req.institutionName().trim())
                        .degree(req.degree() != null ? req.degree().trim() : "")
                        .boardOrUniversity(req.boardOrUniversity() != null ? req.boardOrUniversity().trim() : null)
                        .startYear(req.startYear())
                        .endYear(req.endYear())
                        .grade(req.grade() != null ? req.grade().trim() : null)
                        .isCurrent(Boolean.TRUE.equals(req.isCurrent()))
                        .build();
                studentEducationRepository.save(edu);
            }
        }
    }

    private void saveProjectRecords(StudentProfile profile, List<StudentProjectRequest> projectRequests) {
        if (projectRequests == null || projectRequests.isEmpty()) {
            return;
        }
        for (StudentProjectRequest req : projectRequests) {
            if (req != null && req.title() != null && !req.title().isBlank()) {
                String title = req.title().trim();
                if (studentProjectRepository.existsByStudentIdAndTitle(profile.getId(), title)) {
                    continue; // Avoid duplicate project title for same student
                }
                StudentProject project = StudentProject.builder()
                        .studentProfile(profile)
                        .title(title)
                        .description(req.description())
                        .liveUrl(req.liveUrl())
                        .repoUrl(req.repoUrl())
                        .mediaUrl(req.mediaUrl())
                        .build();
                if (req.techStack() != null) {
                    for (String tech : req.techStack()) {
                        if (tech != null && !tech.isBlank()) {
                            project.addTechnology(tech.trim());
                        }
                    }
                }
                studentProjectRepository.save(project);
            }
        }
    }

    private void updateEducationRecords(StudentProfile profile, List<StudentEducationRequest> educationRequests) {
        studentEducationRepository.deleteByStudentProfileId(profile.getId());
        studentEducationRepository.flush();
        saveEducationRecords(profile, educationRequests);
    }

    private void updateProjectRecords(StudentProfile profile, List<StudentProjectRequest> projectRequests) {
        for (StudentProjectRequest req : projectRequests) {
            if (req != null && req.title() != null && !req.title().isBlank()) {
                String title = req.title().trim();
                Optional<StudentProject> existing = studentProjectRepository.findByStudentIdAndTitle(profile.getId(), title);
                StudentProject project;
                if (existing.isPresent()) {
                    project = existing.get();
                    project.setDescription(req.description());
                    project.setLiveUrl(req.liveUrl());
                    project.setRepoUrl(req.repoUrl());
                    project.setMediaUrl(req.mediaUrl());
                } else {
                    project = StudentProject.builder()
                            .studentProfile(profile)
                            .title(title)
                            .description(req.description())
                            .liveUrl(req.liveUrl())
                            .repoUrl(req.repoUrl())
                            .mediaUrl(req.mediaUrl())
                            .build();
                }

                if (req.techStack() != null) {
                    Set<String> newTechs = req.techStack().stream()
                            .filter(t -> t != null && !t.isBlank())
                            .map(String::trim)
                            .collect(Collectors.toSet());

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
                        for (String tech : newTechs) {
                            project.addTechnology(tech);
                        }
                    }
                }
                studentProjectRepository.save(project);
            }
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    private StudentProfileResponse buildFullProfileResponse(StudentProfile profile) {
        var skills = studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(profile.getId())
                .stream().map(StudentSkillResponse::from).toList();
        var education = studentEducationRepository.findByStudentProfileId(profile.getId())
                .stream().map(StudentEducationResponse::from).toList();
        var experience = studentExperienceRepository.findByStudentProfileId(profile.getId())
                .stream().map(StudentExperienceResponse::from).toList();
        var projects = studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(profile.getId())
                .stream().map(StudentProjectResponse::from).toList();

        return StudentProfileResponse.withDetails(profile, skills, education, experience, projects);
    }

    private short calculateCompletionPercentage(StudentProfile p) {
        int score = 0;
        if (p.getFullName() != null && !p.getFullName().isBlank()) score += 10;
        if (p.getPhone() != null && !p.getPhone().isBlank()) score += 10;
        if (p.getAddress() != null && !p.getAddress().isBlank()) score += 10;
        if (p.getAbout() != null && !p.getAbout().isBlank()) score += 10;
        if (p.getAvatarUrl() != null && !p.getAvatarUrl().isBlank()) score += 5;
        if (p.getResumeUrl() != null && !p.getResumeUrl().isBlank()) score += 15;
        if (p.getCollege() != null && !p.getCollege().isBlank()) score += 10;
        if (p.getDegree() != null && !p.getDegree().isBlank()) score += 10;
        if (p.getDepartment() != null && !p.getDepartment().isBlank()) score += 10;
        if (p.getSemester() != null) score += 5;
        if (p.getCgpa() != null) score += 5;
        return (short) Math.min(score, 100);
    }
}
