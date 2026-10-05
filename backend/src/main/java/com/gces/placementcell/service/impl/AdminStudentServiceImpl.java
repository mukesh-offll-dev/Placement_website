package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.entity.*;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.*;
import com.gces.placementcell.service.AdminStudentService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminStudentServiceImpl implements AdminStudentService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final StudentSkillRepository studentSkillRepository;
    private final StudentEducationRepository studentEducationRepository;
    private final StudentExperienceRepository studentExperienceRepository;
    private final StudentProjectRepository studentProjectRepository;
    private final ProjectTechStackRepository projectTechStackRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentSummaryDto> getStudents(
            String search,
            String department,
            PlacementStatus status,
            BigDecimal minCgpa,
            int page,
            int size,
            String sortBy,
            String sortDir) {

        int validPage = Math.max(0, page);
        int validSize = size > 0 ? size : 10;

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String validSortBy = StringUtils.hasText(sortBy) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(validPage, validSize, Sort.by(direction, validSortBy));

        Specification<StudentProfile> spec = createStudentSpecification(search, department, status, minCgpa);
        Page<StudentProfile> profilePage = studentProfileRepository.findAll(spec, pageable);

        Map<Long, String> companyNames = fetchCompanyNames(profilePage.getContent());

        List<StudentSummaryDto> dtoList = profilePage.getContent().stream()
                .map(p -> mapToSummaryDto(p, companyNames.get(p.getPlacedCompanyId())))
                .collect(Collectors.toList());

        return PageResponse.<StudentSummaryDto>builder()
                .content(dtoList)
                .page(profilePage.getNumber())
                .size(profilePage.getSize())
                .totalElements(profilePage.getTotalElements())
                .totalPages(profilePage.getTotalPages())
                .first(profilePage.isFirst())
                .last(profilePage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDetailDto getStudentById(Long id) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        if (profile.getUser() != null && Boolean.TRUE.equals(profile.getUser().getIsDeleted())) {
            throw new ResourceNotFoundException("Student with ID " + id + " has been deactivated");
        }

        return buildStudentDetailDto(profile);
    }

    @Override
    @Transactional
    public StudentDetailDto createStudent(CreateStudentRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String rollNo = request.getRollNo() != null ? request.getRollNo().trim().toUpperCase() : null;

        // Check duplicate email
        if (userRepository.existsByEmail(email) || studentProfileRepository.existsByEmail(email)) {
            throw new BadRequestException("Student with email '" + email + "' already exists");
        }

        // Check duplicate roll number
        if (rollNo != null && studentProfileRepository.existsByRollNo(rollNo)) {
            throw new BadRequestException("Student with register/roll number '" + rollNo + "' already exists");
        }

        // 1. Create User
        String rawPassword = StringUtils.hasText(request.getPassword()) ? request.getPassword() : "Student@123";
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .build();
        User savedUser = userRepository.save(user);

        // 2. Create StudentProfile
        PlacementStatus placementStatus = request.getPlacementStatus() != null
                ? request.getPlacementStatus()
                : PlacementStatus.PENDING;

        Short completion = request.getProfileCompletionPercent();
        if (completion == null) {
            completion = calculateProfileCompletion(request);
        }

        StudentProfile profile = StudentProfile.builder()
                .user(savedUser)
                .rollNo(rollNo)
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(request.getPhone())
                .address(request.getAddress())
                .about(request.getAbout())
                .avatarUrl(request.getAvatarUrl())
                .resumeUrl(request.getResumeUrl())
                .college(StringUtils.hasText(request.getCollege()) ? request.getCollege() : "GCE Srirangam")
                .degree(request.getDegree())
                .department(request.getDepartment())
                .departmentCode(request.getDepartmentCode())
                .batch(request.getBatch())
                .semester(request.getSemester())
                .cgpa(request.getCgpa())
                .totalBacklogs(request.getTotalBacklogs() != null ? request.getTotalBacklogs() : 0)
                .activeBacklogs(request.getActiveBacklogs() != null ? request.getActiveBacklogs() : 0)
                .placementStatus(placementStatus)
                .isOpenToOpportunities(request.getIsOpenToOpportunities() != null ? request.getIsOpenToOpportunities() : true)
                .placedCompanyId(request.getPlacedCompanyId())
                .placedCtc(request.getPlacedCtc())
                .placedOn(request.getPlacedOn())
                .profileCompletionPercent(completion)
                .build();

        StudentProfile savedProfile = studentProfileRepository.save(profile);

        // 3. Save skills if provided
        if (request.getSkills() != null && !request.getSkills().isEmpty()) {
            for (String skillName : request.getSkills()) {
                if (StringUtils.hasText(skillName)) {
                    StudentSkill skill = StudentSkill.builder()
                            .studentProfile(savedProfile)
                            .skillName(skillName.trim())
                            .proficiency(com.gces.placementcell.entity.enums.SkillProficiency.INTERMEDIATE)
                            .build();
                    studentSkillRepository.save(skill);
                }
            }
        }

        return buildStudentDetailDto(savedProfile);
    }

    @Override
    @Transactional
    public StudentDetailDto updateStudent(Long id, UpdateStudentRequest request) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        // Check roll number uniqueness if updated
        if (StringUtils.hasText(request.getRollNo())) {
            String newRollNo = request.getRollNo().trim().toUpperCase();
            if (!newRollNo.equalsIgnoreCase(profile.getRollNo())) {
                if (studentProfileRepository.existsByRollNo(newRollNo)) {
                    throw new BadRequestException("Student with roll number '" + newRollNo + "' already exists");
                }
                profile.setRollNo(newRollNo);
            }
        }

        // Check email uniqueness if updated
        if (StringUtils.hasText(request.getEmail())) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(profile.getEmail())) {
                if (studentProfileRepository.existsByEmail(newEmail) || userRepository.existsByEmail(newEmail)) {
                    throw new BadRequestException("Student with email '" + newEmail + "' already exists");
                }
                profile.setEmail(newEmail);
                if (profile.getUser() != null) {
                    profile.getUser().setEmail(newEmail);
                    userRepository.save(profile.getUser());
                }
            }
        }

        if (StringUtils.hasText(request.getFullName())) {
            profile.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            profile.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress());
        }
        if (request.getAbout() != null) {
            profile.setAbout(request.getAbout());
        }
        if (request.getAvatarUrl() != null) {
            profile.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getResumeUrl() != null) {
            profile.setResumeUrl(request.getResumeUrl());
        }
        if (request.getCollege() != null) {
            profile.setCollege(request.getCollege());
        }
        if (request.getDegree() != null) {
            profile.setDegree(request.getDegree());
        }
        if (request.getDepartment() != null) {
            profile.setDepartment(request.getDepartment());
        }
        if (request.getDepartmentCode() != null) {
            profile.setDepartmentCode(request.getDepartmentCode());
        }
        if (request.getBatch() != null) {
            profile.setBatch(request.getBatch());
        }
        if (request.getSemester() != null) {
            profile.setSemester(request.getSemester());
        }
        if (request.getCgpa() != null) {
            profile.setCgpa(request.getCgpa());
        }
        if (request.getTotalBacklogs() != null) {
            profile.setTotalBacklogs(request.getTotalBacklogs());
        }
        if (request.getActiveBacklogs() != null) {
            profile.setActiveBacklogs(request.getActiveBacklogs());
        }
        if (request.getPlacementStatus() != null) {
            profile.setPlacementStatus(request.getPlacementStatus());
        }
        if (request.getIsOpenToOpportunities() != null) {
            profile.setIsOpenToOpportunities(request.getIsOpenToOpportunities());
        }
        if (request.getPlacedCompanyId() != null) {
            profile.setPlacedCompanyId(request.getPlacedCompanyId());
        }
        if (request.getPlacedCtc() != null) {
            profile.setPlacedCtc(request.getPlacedCtc());
        }
        if (request.getPlacedOn() != null) {
            profile.setPlacedOn(request.getPlacedOn());
        }
        if (request.getProfileCompletionPercent() != null) {
            profile.setProfileCompletionPercent(request.getProfileCompletionPercent());
        }

        // Account status updates
        if (profile.getUser() != null) {
            if (request.getIsActive() != null) {
                profile.getUser().setIsActive(request.getIsActive());
            }
            if (request.getAccountStatus() != null) {
                profile.getUser().setAccountStatus(request.getAccountStatus());
            }
            userRepository.save(profile.getUser());
        }

        // Update skills if provided
        if (request.getSkills() != null) {
            studentSkillRepository.deleteByStudentProfileId(profile.getId());
            for (String s : request.getSkills()) {
                if (StringUtils.hasText(s)) {
                    studentSkillRepository.save(StudentSkill.builder()
                            .studentProfile(profile)
                            .skillName(s.trim())
                            .proficiency(com.gces.placementcell.entity.enums.SkillProficiency.INTERMEDIATE)
                            .build());
                }
            }
        }

        StudentProfile updated = studentProfileRepository.save(profile);
        return buildStudentDetailDto(updated);
    }

    @Override
    @Transactional
    public void deleteStudent(Long id) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        // Soft delete the user and deactivate profile
        if (profile.getUser() != null) {
            User user = profile.getUser();
            user.setIsDeleted(true);
            user.setIsActive(false);
            user.setAccountStatus(AccountStatus.INACTIVE);
            userRepository.save(user);
        }

        profile.setPlacementStatus(PlacementStatus.BLOCKED);
        studentProfileRepository.save(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportStudentsCsv(String search, String department, PlacementStatus status) {
        Specification<StudentProfile> spec = createStudentSpecification(search, department, status, null);
        List<StudentProfile> students = studentProfileRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "rollNo", "fullName"));

        Map<Long, String> companyNames = fetchCompanyNames(students);

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        csv.append('\uFEFF');

        // Headers
        csv.append("ID,Register / Roll No,Full Name,Email,Phone,Department,Degree,Batch,Semester,CGPA,Placement Status,Placed Company,Placed CTC,Profile Completion %,Active Backlogs,Registered At\n");

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (StudentProfile s : students) {
            String company = companyNames.getOrDefault(s.getPlacedCompanyId(), "");
            String registeredAt = s.getCreatedAt() != null ? s.getCreatedAt().format(dateFmt) : "";

            csv.append(s.getId()).append(",")
                    .append(escapeCsv(s.getRollNo())).append(",")
                    .append(escapeCsv(s.getFullName())).append(",")
                    .append(escapeCsv(s.getEmail())).append(",")
                    .append(escapeCsv(s.getPhone())).append(",")
                    .append(escapeCsv(s.getDepartment())).append(",")
                    .append(escapeCsv(s.getDegree())).append(",")
                    .append(escapeCsv(s.getBatch())).append(",")
                    .append(s.getSemester() != null ? s.getSemester() : "").append(",")
                    .append(s.getCgpa() != null ? s.getCgpa().toString() : "").append(",")
                    .append(escapeCsv(s.getPlacementStatus() != null ? s.getPlacementStatus().name() : "")).append(",")
                    .append(escapeCsv(company)).append(",")
                    .append(s.getPlacedCtc() != null ? s.getPlacedCtc().toString() : "").append(",")
                    .append(s.getProfileCompletionPercent() != null ? s.getProfileCompletionPercent() : 0).append(",")
                    .append(s.getActiveBacklogs() != null ? s.getActiveBacklogs() : 0).append(",")
                    .append(registeredAt).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // Helper methods
    private Specification<StudentProfile> createStudentSpecification(
            String search, String department, PlacementStatus status, BigDecimal minCgpa) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude soft-deleted users
            Join<StudentProfile, User> userJoin = root.join("user", JoinType.LEFT);
            predicates.add(cb.or(
                    cb.isNull(userJoin.get("id")),
                    cb.equal(userJoin.get("isDeleted"), false)
            ));

            // Search query
            if (StringUtils.hasText(search)) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("rollNo")), pattern),
                        cb.like(cb.lower(root.get("department")), pattern),
                        cb.like(cb.lower(root.get("departmentCode")), pattern)
                ));
            }

            // Department filter
            if (StringUtils.hasText(department) && !"All".equalsIgnoreCase(department)) {
                predicates.add(cb.or(
                        cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase()),
                        cb.equal(cb.lower(root.get("departmentCode")), department.trim().toLowerCase())
                ));
            }

            // Placement status filter
            if (status != null) {
                predicates.add(cb.equal(root.get("placementStatus"), status));
            }

            // CGPA filter
            if (minCgpa != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("cgpa"), minCgpa));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Map<Long, String> fetchCompanyNames(List<StudentProfile> profiles) {
        Set<Long> companyIds = profiles.stream()
                .map(StudentProfile::getPlacedCompanyId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (companyIds.isEmpty()) {
            return Collections.emptyMap();
        }

        // placed_company_id references companies, not jobs.
        return companyRepository.findAllById(companyIds).stream()
                .collect(Collectors.toMap(Company::getId, Company::getName, (a, b) -> a));
    }

    private StudentSummaryDto mapToSummaryDto(StudentProfile p, String companyName) {
        User u = p.getUser();
        return StudentSummaryDto.builder()
                .id(p.getId())
                .userId(u != null ? u.getId() : null)
                .rollNo(p.getRollNo())
                .fullName(p.getFullName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .department(p.getDepartment())
                .departmentCode(p.getDepartmentCode())
                .degree(p.getDegree())
                .batch(p.getBatch())
                .semester(p.getSemester())
                .cgpa(p.getCgpa())
                .totalBacklogs(p.getTotalBacklogs())
                .activeBacklogs(p.getActiveBacklogs())
                .placementStatus(p.getPlacementStatus())
                .isOpenToOpportunities(p.getIsOpenToOpportunities())
                .placedCompanyId(p.getPlacedCompanyId())
                .placedCompanyName(companyName)
                .placedCtc(p.getPlacedCtc())
                .placedOn(p.getPlacedOn())
                .profileCompletionPercent(p.getProfileCompletionPercent())
                .accountStatus(u != null ? u.getAccountStatus() : null)
                .isActive(u != null ? u.getIsActive() : true)
                .isDeleted(u != null ? u.getIsDeleted() : false)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private StudentDetailDto buildStudentDetailDto(StudentProfile profile) {
        User user = profile.getUser();
        Long profileId = profile.getId();

        // 1. Placed company name
        String placedCompanyName = null;
        if (profile.getPlacedCompanyId() != null) {
            placedCompanyName = companyRepository.findById(profile.getPlacedCompanyId())
                    .map(Company::getName)
                    .orElse(null);
        }

        // 2. Skills
        List<SkillDto> skills = studentSkillRepository.findByStudentProfileId(profileId).stream()
                .map(s -> SkillDto.builder()
                        .id(s.getId())
                        .skillName(s.getSkillName())
                        .proficiency(s.getProficiency() != null ? s.getProficiency().name() : null)
                        .build())
                .collect(Collectors.toList());

        // 3. Education
        List<EducationDto> education = studentEducationRepository.findByStudentProfileIdOrderByStartYearDesc(profileId).stream()
                .map(e -> EducationDto.builder()
                        .id(e.getId())
                        .institutionName(e.getInstitutionName())
                        .degree(e.getDegree())
                        .boardOrUniversity(e.getBoardOrUniversity())
                        .startYear(e.getStartYear())
                        .endYear(e.getEndYear())
                        .grade(e.getGrade())
                        .isCurrent(e.getIsCurrent())
                        .build())
                .collect(Collectors.toList());

        // 4. Experience
        List<ExperienceDto> experience = studentExperienceRepository.findByStudentProfileIdOrderByStartDateDesc(profileId).stream()
                .map(exp -> ExperienceDto.builder()
                        .id(exp.getId())
                        .jobRole(exp.getJobRole())
                        .company(exp.getCompany())
                        .experienceType(exp.getExperienceType())
                        .location(exp.getLocation())
                        .startDate(exp.getStartDate())
                        .endDate(exp.getEndDate())
                        .isCurrent(exp.getIsCurrent())
                        .description(exp.getDescription())
                        .build())
                .collect(Collectors.toList());

        // 5. Projects
        List<ProjectDto> projects = studentProjectRepository.findByStudentProfileIdOrderByCreatedAtDesc(profileId).stream()
                .map(proj -> {
                    List<String> techStack = projectTechStackRepository.findByProjectId(proj.getId()).stream()
                            .map(ProjectTechStack::getTechnology)
                            .collect(Collectors.toList());
                    return ProjectDto.builder()
                            .id(proj.getId())
                            .title(proj.getTitle())
                            .description(proj.getDescription())
                            .liveUrl(proj.getLiveUrl())
                            .repoUrl(proj.getRepoUrl())
                            .mediaUrl(proj.getMediaUrl())
                            .techStack(techStack)
                            .build();
                })
                .collect(Collectors.toList());

        // 6. Applications
        List<JobApplication> apps = jobApplicationRepository.findByStudentProfileId(profileId);
        List<ApplicationSummaryDto> appDtos = apps.stream()
                .map(app -> ApplicationSummaryDto.builder()
                        .id(app.getId())
                        .jobId(app.getJob() != null ? app.getJob().getId() : null)
                        .jobTitle(app.getJob() != null ? app.getJob().getTitle() : null)
                        .company(app.getJob() != null ? app.getJob().getCompanyName() : null)
                        .status(app.getStatus())
                        .currentStage(app.getCurrentStage())
                        .appliedAt(app.getAppliedAt())
                        .build())
                .collect(Collectors.toList());

        long totalApps = apps.size();
        long shortlistedCount = apps.stream()
                .filter(a -> ApplicationStatus.SHORTLISTED.equals(a.getStatus()) || ApplicationStatus.SELECTED.equals(a.getStatus()))
                .count();

        return StudentDetailDto.builder()
                .id(profile.getId())
                .userId(user != null ? user.getId() : null)
                .rollNo(profile.getRollNo())
                .fullName(profile.getFullName())
                .email(profile.getEmail())
                .phone(profile.getPhone())
                .address(profile.getAddress())
                .about(profile.getAbout())
                .avatarUrl(profile.getAvatarUrl())
                .resumeUrl(profile.getResumeUrl())
                .college(profile.getCollege())
                .degree(profile.getDegree())
                .department(profile.getDepartment())
                .departmentCode(profile.getDepartmentCode())
                .batch(profile.getBatch())
                .semester(profile.getSemester())
                .cgpa(profile.getCgpa())
                .totalBacklogs(profile.getTotalBacklogs())
                .activeBacklogs(profile.getActiveBacklogs())
                .placementStatus(profile.getPlacementStatus())
                .isOpenToOpportunities(profile.getIsOpenToOpportunities())
                .placedCompanyId(profile.getPlacedCompanyId())
                .placedCompanyName(placedCompanyName)
                .placedCtc(profile.getPlacedCtc())
                .placedOn(profile.getPlacedOn())
                .profileCompletionPercent(profile.getProfileCompletionPercent())
                .accountStatus(user != null ? user.getAccountStatus() : null)
                .isActive(user != null ? user.getIsActive() : true)
                .isDeleted(user != null ? user.getIsDeleted() : false)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .skills(skills)
                .education(education)
                .experience(experience)
                .projects(projects)
                .applications(appDtos)
                .totalApplications(totalApps)
                .shortlistedCount(shortlistedCount)
                .build();
    }

    private Short calculateProfileCompletion(CreateStudentRequest req) {
        int score = 0;
        if (StringUtils.hasText(req.getFullName())) score += 15;
        if (StringUtils.hasText(req.getEmail())) score += 15;
        if (StringUtils.hasText(req.getRollNo())) score += 15;
        if (StringUtils.hasText(req.getDepartment())) score += 15;
        if (req.getCgpa() != null) score += 15;
        if (StringUtils.hasText(req.getPhone())) score += 10;
        if (StringUtils.hasText(req.getAddress())) score += 5;
        if (req.getSkills() != null && !req.getSkills().isEmpty()) score += 10;
        return (short) Math.min(100, score);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String clean = value.replace("\r", " ").replace("\n", " ");
        if (clean.contains(",") || clean.contains("\"") || clean.contains(";")) {
            return "\"" + clean.replace("\"", "\"\"") + "\"";
        }
        return clean;
    }
}
