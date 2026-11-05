package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentExperience;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentSkill;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.SkillProficiency;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.*;
import com.gces.placementcell.service.StudentProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;

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

        if (request.skills() != null && !request.skills().isEmpty()) {
            saveSkillsForProfile(profile, request.skills());
        }

        return buildFullProfileResponse(profile);
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

        if (request.skills() != null) {
            studentSkillRepository.deleteByStudentProfileId(profile.getId());
            studentSkillRepository.flush();
            saveSkillsForProfile(profile, request.skills());
        }

        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        profile = studentProfileRepository.save(profile);
        log.info("Updated student profile for user: {}", email);

        return buildFullProfileResponse(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentSkillResponse> getSkills(String email) {
        StudentProfile profile = findProfileByEmail(email);
        return studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(profile.getId())
                .stream().map(StudentSkillResponse::from).toList();
    }

    @Override
    @Transactional
    public List<StudentSkillResponse> updateSkills(String email, List<String> skills) {
        StudentProfile profile = findProfileByEmail(email);
        studentSkillRepository.deleteByStudentProfileId(profile.getId());
        studentSkillRepository.flush();

        if (skills != null) {
            saveSkillsForProfile(profile, skills);
        }

        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        studentProfileRepository.save(profile);

        return studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(profile.getId())
                .stream().map(StudentSkillResponse::from).toList();
    }

    @Override
    @Transactional
    public StudentSkillResponse addSkill(String email, StudentSkillRequest request) {
        if (request == null || !StringUtils.hasText(request.skillName())) {
            throw new BadRequestException("Skill name is required");
        }
        String skillName = request.skillName().trim();
        if (skillName.length() > 60) {
            throw new BadRequestException("Skill name cannot exceed 60 characters");
        }

        StudentProfile profile = findProfileByEmail(email);

        if (studentSkillRepository.existsByStudentProfileIdAndSkillNameIgnoreCase(profile.getId(), skillName)) {
            throw new DuplicateResourceException("Skill '" + skillName + "' already exists in your profile");
        }

        StudentSkill skill = StudentSkill.builder()
                .studentProfile(profile)
                .skillName(skillName)
                .proficiency(request.proficiency() != null ? request.proficiency() : SkillProficiency.INTERMEDIATE)
                .build();

        StudentSkill saved = studentSkillRepository.save(skill);
        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        studentProfileRepository.save(profile);

        return StudentSkillResponse.from(saved);
    }

    @Override
    @Transactional
    public StudentSkillResponse updateSkill(String email, Long skillId, StudentSkillRequest request) {
        if (request == null || !StringUtils.hasText(request.skillName())) {
            throw new BadRequestException("Skill name is required");
        }
        String skillName = request.skillName().trim();
        if (skillName.length() > 60) {
            throw new BadRequestException("Skill name cannot exceed 60 characters");
        }

        StudentProfile profile = findProfileByEmail(email);
        StudentSkill skill = studentSkillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with ID: " + skillId));

        if (!skill.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Skill not found with ID: " + skillId);
        }

        if (!skill.getSkillName().equalsIgnoreCase(skillName) &&
                studentSkillRepository.existsByStudentProfileIdAndSkillNameIgnoreCase(profile.getId(), skillName)) {
            throw new DuplicateResourceException("Skill '" + skillName + "' already exists in your profile");
        }

        skill.setSkillName(skillName);
        if (request.proficiency() != null) {
            skill.setProficiency(request.proficiency());
        }
        StudentSkill updated = studentSkillRepository.save(skill);
        return StudentSkillResponse.from(updated);
    }

    @Override
    @Transactional
    public void deleteSkill(String email, Long skillId) {
        StudentProfile profile = findProfileByEmail(email);
        StudentSkill skill = studentSkillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with ID: " + skillId));

        if (!skill.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Skill not found with ID: " + skillId);
        }

        studentSkillRepository.delete(skill);
        profile.setProfileCompletionPercent(calculateCompletionPercentage(profile));
        studentProfileRepository.save(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentEducationResponse> getEducation(String email) {
        StudentProfile profile = findProfileByEmail(email);
        return studentEducationRepository.findByStudentProfileIdOrderByStartYearDesc(profile.getId())
                .stream().map(StudentEducationResponse::from).toList();
    }

    @Override
    @Transactional
    public StudentEducationResponse addEducation(String email, StudentEducationRequest request) {
        if (request == null) {
            throw new BadRequestException("Education details are required");
        }
        StudentProfile profile = findProfileByEmail(email);

        StudentEducation education = StudentEducation.builder()
                .studentProfile(profile)
                .institutionName(request.institutionName().trim())
                .degree(request.degree().trim())
                .boardOrUniversity(request.boardOrUniversity() != null ? request.boardOrUniversity().trim() : null)
                .startYear(request.startYear())
                .endYear(Boolean.TRUE.equals(request.isCurrent()) ? null : request.endYear())
                .grade(request.grade() != null ? request.grade().trim() : null)
                .isCurrent(Boolean.TRUE.equals(request.isCurrent()))
                .build();

        StudentEducation saved = studentEducationRepository.save(education);
        log.info("Added education entry {} for student profile {}", saved.getId(), profile.getId());
        return StudentEducationResponse.from(saved);
    }

    @Override
    @Transactional
    public StudentEducationResponse updateEducation(String email, Long educationId, StudentEducationRequest request) {
        if (request == null) {
            throw new BadRequestException("Education details are required");
        }
        StudentProfile profile = findProfileByEmail(email);
        StudentEducation education = studentEducationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("Education record not found with ID: " + educationId));

        if (!education.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Education record not found with ID: " + educationId);
        }

        education.setInstitutionName(request.institutionName().trim());
        education.setDegree(request.degree().trim());
        education.setBoardOrUniversity(request.boardOrUniversity() != null ? request.boardOrUniversity().trim() : null);
        education.setStartYear(request.startYear());
        education.setIsCurrent(Boolean.TRUE.equals(request.isCurrent()));
        education.setEndYear(Boolean.TRUE.equals(request.isCurrent()) ? null : request.endYear());
        education.setGrade(request.grade() != null ? request.grade().trim() : null);

        StudentEducation updated = studentEducationRepository.save(education);
        log.info("Updated education entry {} for student profile {}", updated.getId(), profile.getId());
        return StudentEducationResponse.from(updated);
    }

    @Override
    @Transactional
    public void deleteEducation(String email, Long educationId) {
        StudentProfile profile = findProfileByEmail(email);
        StudentEducation education = studentEducationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("Education record not found with ID: " + educationId));

        if (!education.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Education record not found with ID: " + educationId);
        }

        studentEducationRepository.delete(education);
        log.info("Deleted education entry {} for student profile {}", educationId, profile.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentExperienceResponse> getExperience(String email) {
        StudentProfile profile = findProfileByEmail(email);
        return studentExperienceRepository.findByStudentProfileIdOrderByStartDateDesc(profile.getId())
                .stream().map(StudentExperienceResponse::from).toList();
    }

    @Override
    @Transactional
    public StudentExperienceResponse addExperience(String email, StudentExperienceRequest request) {
        if (request == null) {
            throw new BadRequestException("Experience details are required");
        }
        StudentProfile profile = findProfileByEmail(email);

        StudentExperience experience = StudentExperience.builder()
                .studentProfile(profile)
                .jobRole(request.jobRole().trim())
                .company(request.company().trim())
                .experienceType(request.experienceType() != null ? request.experienceType() : ExperienceType.INTERNSHIP)
                .location(request.location() != null ? request.location().trim() : null)
                .startDate(request.startDate())
                .endDate(Boolean.TRUE.equals(request.isCurrent()) ? null : request.endDate())
                .isCurrent(Boolean.TRUE.equals(request.isCurrent()))
                .description(request.description() != null ? request.description().trim() : null)
                .build();

        StudentExperience saved = studentExperienceRepository.save(experience);
        log.info("Added experience entry {} for student profile {}", saved.getId(), profile.getId());
        return StudentExperienceResponse.from(saved);
    }

    @Override
    @Transactional
    public StudentExperienceResponse updateExperience(String email, Long experienceId, StudentExperienceRequest request) {
        if (request == null) {
            throw new BadRequestException("Experience details are required");
        }
        StudentProfile profile = findProfileByEmail(email);
        StudentExperience experience = studentExperienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience record not found with ID: " + experienceId));

        if (!experience.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Experience record not found with ID: " + experienceId);
        }

        experience.setJobRole(request.jobRole().trim());
        experience.setCompany(request.company().trim());
        experience.setExperienceType(request.experienceType() != null ? request.experienceType() : ExperienceType.INTERNSHIP);
        experience.setLocation(request.location() != null ? request.location().trim() : null);
        experience.setStartDate(request.startDate());
        experience.setIsCurrent(Boolean.TRUE.equals(request.isCurrent()));
        experience.setEndDate(Boolean.TRUE.equals(request.isCurrent()) ? null : request.endDate());
        experience.setDescription(request.description() != null ? request.description().trim() : null);

        StudentExperience updated = studentExperienceRepository.save(experience);
        log.info("Updated experience entry {} for student profile {}", updated.getId(), profile.getId());
        return StudentExperienceResponse.from(updated);
    }

    @Override
    @Transactional
    public void deleteExperience(String email, Long experienceId) {
        StudentProfile profile = findProfileByEmail(email);
        StudentExperience experience = studentExperienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience record not found with ID: " + experienceId));

        if (!experience.getStudentProfile().getId().equals(profile.getId())) {
            throw new ResourceNotFoundException("Experience record not found with ID: " + experienceId);
        }

        studentExperienceRepository.delete(experience);
        log.info("Deleted experience entry {} for student profile {}", experienceId, profile.getId());
    }

    private StudentProfile findProfileByEmail(String email) {
        User user = findUserByEmail(email);
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + email));
    }

    private void saveSkillsForProfile(StudentProfile profile, List<String> skills) {
        Set<String> seen = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (String s : skills) {
            if (StringUtils.hasText(s)) {
                String trimmed = s.trim();
                if (trimmed.length() > 60) {
                    trimmed = trimmed.substring(0, 60);
                }
                if (seen.add(trimmed)) {
                    StudentSkill skill = StudentSkill.builder()
                            .studentProfile(profile)
                            .skillName(trimmed)
                            .proficiency(SkillProficiency.INTERMEDIATE)
                            .build();
                    studentSkillRepository.save(skill);
                }
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
