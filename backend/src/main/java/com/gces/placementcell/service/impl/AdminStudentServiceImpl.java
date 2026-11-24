package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.BulkProvisionStudentsRequest;
import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.ProvisionStudentRequest;
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
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.security.LoginAttemptLimiter;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AdminStudentService;
import com.gces.placementcell.service.DepartmentService;
import com.gces.placementcell.service.StudentIdentity;
import com.gces.placementcell.service.StudentScope;
import com.gces.placementcell.service.AuditService;
import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.dto.request.ArchiveBatchRequest;
import com.gces.placementcell.dto.request.BulkStudentActionRequest;
import com.gces.placementcell.entity.enums.BulkStudentAction;
import com.gces.placementcell.entity.enums.DocumentType;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.exception.ConflictException;
import jakarta.persistence.criteria.Fetch;
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
    private final TokenProvider tokenProvider;
    private final LoginAttemptLimiter loginAttemptLimiter;
    private final DepartmentService departmentService;
    private final StudentCertificationRepository certificationRepository;
    private final StudentAchievementRepository achievementRepository;
    private final StudentDocumentRepository documentRepository;
    private final AuditService auditService;
    private final StudentProfileVersionRepository versionRepository;

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_IDS = 5000;
    private static final java.util.Set<String> SORTABLE_FIELDS = java.util.Set.of(
            "createdAt", "updatedAt", "fullName", "rollNo", "email", "cgpa", "department",
            "departmentCode", "batch", "placementStatus", "placedCtc", "placedOn",
            "activeBacklogs", "profileCompletionPercent");

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentSummaryDto> getStudents(
            StudentListFilter filter,
            int page,
            int size,
            String sortBy,
            String sortDir,
            StudentScope scope) {

        int validPage = Math.max(0, page);
        int validSize = size > 0 ? Math.min(size, MAX_PAGE_SIZE) : 10;

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        // Only known columns: an arbitrary property name would fail the query with a 500.
        String validSortBy = StringUtils.hasText(sortBy) && SORTABLE_FIELDS.contains(sortBy.trim())
                ? sortBy.trim() : "createdAt";
        Pageable pageable = PageRequest.of(validPage, validSize, Sort.by(direction, validSortBy));

        Specification<StudentProfile> spec = createStudentSpecification(filter, scope);
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

    // Scope-less variants (all departments). Overridden here, not left as interface defaults, so the
    // calls go through the transactional proxy.

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentSummaryDto> getStudents(String search, String department, PlacementStatus status,
                                                       BigDecimal minCgpa, int page, int size, String sortBy, String sortDir) {
        return getStudents(new StudentListFilter(search, department, status, minCgpa, null, null, null),
                page, size, sortBy, sortDir, StudentScope.officer());
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDetailDto getStudentById(Long id) {
        return getStudentById(id, StudentScope.officer());
    }

    @Override
    @Transactional
    public StudentDetailDto updateStudent(Long id, UpdateStudentRequest request) {
        return updateStudent(id, request, StudentScope.officer());
    }

    @Override
    @Transactional
    public void deleteStudent(Long id) {
        deleteStudent(id, StudentScope.officer());
    }

    @Override
    @Transactional
    public StudentSummaryDto provisionStudent(ProvisionStudentRequest request) {
        return provisionStudent(request, StudentScope.officer());
    }

    @Override
    @Transactional
    public BulkProvisionResult provisionStudents(BulkProvisionStudentsRequest request) {
        return provisionStudents(request, StudentScope.officer());
    }

    @Override
    @Transactional
    public StudentSummaryDto setStudentActive(Long id, boolean active) {
        return setStudentActive(id, active, StudentScope.officer());
    }

    @Override
    @Transactional
    public void resetStudentPassword(Long id) {
        resetStudentPassword(id, StudentScope.officer());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> getStudentIds(StudentListFilter filter, StudentScope scope) {
        Specification<StudentProfile> spec = createStudentSpecification(filter, scope);
        return studentProfileRepository.findAll(spec, PageRequest.of(0, MAX_IDS, Sort.by(Sort.Direction.ASC, "id")))
                .getContent().stream().map(StudentProfile::getId).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDetailDto getStudentById(Long id, StudentScope scope) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .filter(scope::allows)
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
        String rollNo = StudentIdentity.requireValid(request.getRollNo());

        if (StudentIdentity.isPlaceholderEmail(email)) {
            throw new BadRequestException("Enter the student's real email address");
        }

        // Check duplicate email
        if (userRepository.existsByEmail(email) || studentProfileRepository.existsByEmail(email)) {
            throw new BadRequestException("Student with email '" + email + "' already exists");
        }

        // Check duplicate roll number
        if (rollNo != null && studentProfileRepository.existsByRollNo(rollNo)) {
            throw new BadRequestException("Student with register/roll number '" + rollNo + "' already exists");
        }

        // 1. Create User. The initial password is the register number unless the admin set one;
        // either way the student must replace it (and confirm their details) at first login.
        String rawPassword = StringUtils.hasText(request.getPassword()) ? request.getPassword() : rollNo;
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .mustChangePassword(true)
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
                .profileSetupCompleted(false)
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
    public StudentDetailDto updateStudent(Long id, UpdateStudentRequest request, StudentScope scope) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .filter(scope::allows)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));

        String oldEmail = profile.getEmail();

        // Check roll number uniqueness if updated
        if (StringUtils.hasText(request.getRollNo())) {
            // A legacy (non 12-digit) number may stay as it is; any change must be a valid one.
            String submitted = StudentIdentity.normalize(request.getRollNo());
            String newRollNo = submitted.equalsIgnoreCase(profile.getRollNo())
                    ? submitted : StudentIdentity.requireValid(submitted);
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
            if (StudentIdentity.isPlaceholderEmail(newEmail)) {
                throw new BadRequestException("Enter the student's real email address");
            }
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
        if (scope.isDepartmentScoped()) {
            // A faculty advisor cannot move a student out of (or into) their department.
            log.debug("Department change ignored for a department-scoped caller");
        } else if (StringUtils.hasText(request.getDepartment())) {
            Department department = departmentService.resolve(request.getDepartment());
            boolean changed = !department.getCode().equalsIgnoreCase(profile.getDepartmentCode());
            // A student may stay in a department that was later switched off, but cannot be moved into one.
            if (changed && !Boolean.TRUE.equals(department.getIsActive())) {
                throw new BadRequestException("Department " + department.getCode()
                        + " is inactive. Reactivate it under Departments first.");
            }
            profile.setDepartment(department.getName());
            profile.setDepartmentCode(department.getCode());
        } else if (request.getDepartmentCode() != null) {
            profile.setDepartmentCode(request.getDepartmentCode());
        }
        if (request.getBatch() != null) {
            profile.setBatch(request.getBatch());
        } else if (request.getYear() != null) {
            profile.setBatch(StudentIdentity.batchForYear(request.getYear()));
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
        // Placement is a plain record: placed (with company, CTC, date) or not placed.
        if (request.getPlacementStatus() == PlacementStatus.PLACED && profile.getPlacedOn() == null) {
            profile.setPlacedOn(java.time.LocalDate.now());
        } else if (request.getPlacementStatus() != null && request.getPlacementStatus() != PlacementStatus.PLACED) {
            profile.setPlacedCompanyId(null);
            profile.setPlacedCtc(null);
            profile.setPlacedOn(null);
        }
        if (request.getProfileCompletionPercent() != null) {
            profile.setProfileCompletionPercent(request.getProfileCompletionPercent());
        }

        // The database rejects active > total backlogs with an opaque error; say it plainly instead.
        if (profile.getActiveBacklogs() != null && profile.getTotalBacklogs() != null
                && profile.getActiveBacklogs() > profile.getTotalBacklogs()) {
            throw new BadRequestException("Active backlogs cannot be more than total backlogs");
        }

        // Account status updates
        if (profile.getUser() != null) {
            if (request.getIsActive() != null) {
                profile.getUser().setIsActive(request.getIsActive());
                // Kept in sync with the lifecycle: inactive = DISABLED (archived students stay archived).
                if (profile.effectiveLifecycle() != LifecycleStatus.ARCHIVED) {
                    profile.setLifecycleStatus(request.getIsActive() ? LifecycleStatus.ACTIVE : LifecycleStatus.DISABLED);
                }
            }
            if (request.getAccountStatus() != null) {
                profile.getUser().setAccountStatus(request.getAccountStatus());
            }
            userRepository.save(profile.getUser());
        }

        // Update skills if provided
        if (request.getSkills() != null) {
            studentSkillRepository.deleteByStudentProfileId(profile.getId());
            // Hibernate runs inserts before deletes at flush; push the deletes out first or a
            // kept skill collides with the unique (student_id, skill_name) constraint.
            studentSkillRepository.flush();
            java.util.Set<String> seenSkills = new java.util.HashSet<>();
            for (String s : request.getSkills()) {
                if (StringUtils.hasText(s) && seenSkills.add(s.trim().toLowerCase(java.util.Locale.ROOT))) {
                    studentSkillRepository.save(StudentSkill.builder()
                            .studentProfile(profile)
                            .skillName(s.trim())
                            .proficiency(com.gces.placementcell.entity.enums.SkillProficiency.INTERMEDIATE)
                            .build());
                }
            }
        }

        StudentProfile updated = studentProfileRepository.save(profile);
        if (updated.getUser() != null) {
            forgetCachedUser(updated.getUser(), oldEmail);
        }
        auditService.record("STUDENT_UPDATE", "STUDENT", updated.getId(), "rollNo=" + updated.getRollNo());
        return buildStudentDetailDto(updated);
    }

    @Override
    @Transactional
    public void deleteStudent(Long id, StudentScope scope) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .filter(scope::allows)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
        softDelete(profile);
        auditService.record("STUDENT_DELETE", "STUDENT", profile.getId(), "rollNo=" + profile.getRollNo());
    }

    /** Soft delete: the login is removed and blocked; applications and history are kept. */
    private void softDelete(StudentProfile profile) {
        if (profile.getUser() != null) {
            User user = profile.getUser();
            user.setIsDeleted(true);
            user.setIsActive(false);
            user.setAccountStatus(AccountStatus.INACTIVE);
            userRepository.save(user);
            forgetCachedUser(user, user.getEmail());
        }

        profile.setPlacementStatus(PlacementStatus.BLOCKED);
        studentProfileRepository.save(profile);
    }

    @Override
    @Transactional
    public StudentSummaryDto provisionStudent(ProvisionStudentRequest request, StudentScope scope) {
        String registerNumber = StudentIdentity.requireValid(request.registerNumber());
        Department department = departmentService.requireActive(
                scope.isDepartmentScoped() ? scope.departmentCode() : request.department());
        if (studentProfileRepository.existsByRollNo(registerNumber)) {
            throw new DuplicateResourceException("A student with register number " + registerNumber + " already exists");
        }
        StudentProfile created = createProvisionedStudent(registerNumber, department, request.year());
        log.info("Student provisioned: registerNumber={}", registerNumber);
        auditService.record("STUDENT_PROVISION", "STUDENT", created.getId(),
                "rollNo=" + registerNumber + ", department=" + department.getCode());
        return mapToSummaryDto(created, null);
    }

    @Override
    @Transactional
    public BulkProvisionResult provisionStudents(BulkProvisionStudentsRequest request, StudentScope scope) {
        List<String> numbers = StudentIdentity.expandRange(request.registerNumberFrom(), request.registerNumberTo());
        Department department = departmentService.requireActive(
                scope.isDepartmentScoped() ? scope.departmentCode() : request.department());
        // One query for the whole range instead of one per number.
        Set<String> existing = new HashSet<>(studentProfileRepository.findExistingRollNos(numbers));

        List<String> created = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        for (String registerNumber : numbers) {
            if (existing.contains(registerNumber)) {
                skipped.add(registerNumber);
                continue;
            }
            createProvisionedStudent(registerNumber, department, request.year());
            created.add(registerNumber);
        }
        log.info("Bulk student provisioning: requested={} created={} skipped={}",
                numbers.size(), created.size(), skipped.size());
        auditService.record("STUDENT_PROVISION_BULK", "STUDENT", null, "department=" + department.getCode()
                + ", range=" + request.registerNumberFrom() + ".." + request.registerNumberTo()
                + ", created=" + created.size() + ", skipped=" + skipped.size());
        return new BulkProvisionResult(numbers.size(), created.size(), skipped.size(), created, skipped);
    }

    @Override
    @Transactional
    public StudentSummaryDto setStudentActive(Long id, boolean active, StudentScope scope) {
        StudentProfile profile = findLiveStudent(id, scope);
        User user = profile.getUser();
        if (user == null) {
            throw new BadRequestException("This student has no login account to change");
        }
        if (profile.effectiveLifecycle() == LifecycleStatus.ARCHIVED) {
            throw new ConflictException(active ? "This student is archived. Restore them instead."
                    : "This student is archived and cannot be disabled.");
        }
        applyActive(profile, active);
        auditService.record(active ? "STUDENT_ENABLE" : "STUDENT_DISABLE", "STUDENT", profile.getId(), null);
        log.info("Student {}: id={}", active ? "reactivated" : "deactivated", id);
        return mapToSummaryDto(profile, null);
    }

    /** DISABLED = login blocked; ACTIVE = login allowed. users.is_active and the lifecycle stay in sync. */
    private void applyActive(StudentProfile profile, boolean active) {
        User user = profile.getUser();
        if (user != null) {
            user.setIsActive(active);
            user.setAccountStatus(active ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);
            userRepository.save(user);
            // Takes effect on the next request rather than after the auth cache window.
            forgetCachedUser(user, user.getEmail());
        }
        profile.setLifecycleStatus(active ? LifecycleStatus.ACTIVE : LifecycleStatus.DISABLED);
        studentProfileRepository.save(profile);
    }

    @Override
    @Transactional
    public void resetStudentPassword(Long id, StudentScope scope) {
        StudentProfile profile = findLiveStudent(id, scope);
        User user = profile.getUser();
        if (user == null || !StringUtils.hasText(profile.getRollNo())) {
            throw new BadRequestException("This student needs a register number before the password can be reset");
        }
        user.setPasswordHash(passwordEncoder.encode(profile.getRollNo()));
        user.setMustChangePassword(true);
        userRepository.save(user);
        loginAttemptLimiter.recordSuccess("rn:" + profile.getRollNo());
        forgetCachedUser(user, user.getEmail());
        auditService.record("STUDENT_RESET_PASSWORD", "STUDENT", profile.getId(), "reset to register number");
        log.info("Student password reset: id={}", id);
    }

    // ------------------------------------------------------------------ bulk actions and archive

    @Override
    @Transactional
    public BulkActionResult bulkAction(BulkStudentActionRequest request, StudentScope scope) {
        if (request.action() == BulkStudentAction.RESTORE && !scope.adminCapable()) {
            throw new org.springframework.security.access.AccessDeniedException("Only an admin can restore archived students");
        }
        List<Long> ids = request.studentIds().stream().filter(Objects::nonNull).distinct().toList();
        Map<Long, StudentProfile> found = studentProfileRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(StudentProfile::getId, p -> p));
        User actor = auditService.currentUser().orElse(null);
        String reason = StringUtils.hasText(request.reason()) ? request.reason().trim() : null;

        int succeeded = 0;
        List<BulkActionResult.Item> failed = new ArrayList<>();
        List<BulkActionResult.Item> skipped = new ArrayList<>();
        for (Long id : ids) {
            StudentProfile profile = found.get(id);
            // Out of scope, unknown and deleted ids all read "Not found": nothing leaks about other departments.
            if (profile == null || !scope.allows(profile) || isDeleted(profile)) {
                failed.add(new BulkActionResult.Item(id, "Not found"));
                continue;
            }
            String skipReason = applyBulk(profile, request.action(), actor, reason);
            if (skipReason != null) {
                skipped.add(new BulkActionResult.Item(id, skipReason));
                continue;
            }
            succeeded++;
            auditService.record(actor, "STUDENT_" + request.action().name(), "STUDENT", id,
                    "bulk" + (reason != null ? "; reason=" + reason : ""));
        }
        log.info("Bulk {}: requested={} succeeded={} skipped={} failed={}", request.action(), ids.size(),
                succeeded, skipped.size(), failed.size());
        return new BulkActionResult(ids.size(), succeeded, skipped.size(), failed, skipped);
    }

    /** Applies one action; returns why it was skipped, or null when it was applied. */
    private String applyBulk(StudentProfile profile, BulkStudentAction action, User actor, String reason) {
        LifecycleStatus lifecycle = profile.effectiveLifecycle();
        switch (action) {
            case DELETE -> softDelete(profile);
            case DISABLE -> {
                if (lifecycle == LifecycleStatus.ARCHIVED) {
                    return "Archived";
                }
                if (lifecycle == LifecycleStatus.DISABLED) {
                    return "Already disabled";
                }
                applyActive(profile, false);
            }
            case ENABLE -> {
                if (lifecycle == LifecycleStatus.ARCHIVED) {
                    return "Archived — restore instead";
                }
                if (lifecycle == LifecycleStatus.ACTIVE
                        && (profile.getUser() == null || Boolean.TRUE.equals(profile.getUser().getIsActive()))) {
                    return "Already active";
                }
                applyActive(profile, true);
            }
            case ARCHIVE -> {
                if (lifecycle == LifecycleStatus.ARCHIVED) {
                    return "Already archived";
                }
                archive(profile, actor, reason);
            }
            case RESTORE -> {
                if (lifecycle != LifecycleStatus.ARCHIVED) {
                    return "Not archived";
                }
                profile.setArchivedAt(null);
                profile.setArchivedBy(null);
                profile.setArchiveReason(null);
                applyActive(profile, true);
            }
        }
        return null;
    }

    /**
     * Archived students keep every record. The login's active flag is left as it is, so a student who
     * was disabled stays unable to sign in until restored.
     */
    private void archive(StudentProfile profile, User actor, String reason) {
        profile.setLifecycleStatus(LifecycleStatus.ARCHIVED);
        profile.setArchivedAt(java.time.LocalDateTime.now());
        profile.setArchivedBy(actor != null ? actor.getId() : null);
        profile.setArchiveReason(reason);
        studentProfileRepository.save(profile);
        if (profile.getUser() != null) {
            forgetCachedUser(profile.getUser(), profile.getUser().getEmail());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ArchivePreviewResponse previewBatchArchive(String batch, String departmentCode) {
        String value = requireBatch(batch);
        String code = StringUtils.hasText(departmentCode) ? departmentCode.trim().toUpperCase(Locale.ROOT) : null;
        long count = studentProfileRepository.count(batchArchiveSpecification(value, code));
        return new ArchivePreviewResponse(count, value, code);
    }

    @Override
    @Transactional
    public BulkActionResult archiveBatch(ArchiveBatchRequest request, StudentScope scope) {
        if (!scope.adminCapable()) {
            throw new org.springframework.security.access.AccessDeniedException("Only an admin can archive a batch");
        }
        String value = requireBatch(request.batch());
        String code = StringUtils.hasText(request.departmentCode())
                ? request.departmentCode().trim().toUpperCase(Locale.ROOT) : null;
        String reason = StringUtils.hasText(request.reason()) ? request.reason().trim() : "Batch " + value + " archived";
        User actor = auditService.currentUser().orElse(null);
        List<StudentProfile> students = studentProfileRepository.findAll(batchArchiveSpecification(value, code));
        for (StudentProfile profile : students) {
            archive(profile, actor, reason);
            auditService.record(actor, "STUDENT_ARCHIVE", "STUDENT", profile.getId(), "batch archive " + value);
        }
        auditService.record(actor, "BATCH_ARCHIVE", "STUDENT_BATCH", null,
                "batch=" + value + (code != null ? ", department=" + code : "") + ", archived=" + students.size()
                        + "; reason=" + reason);
        return new BulkActionResult(students.size(), students.size(), 0, List.of(), List.of());
    }

    private static String requireBatch(String batch) {
        if (!StringUtils.hasText(batch)) {
            throw new BadRequestException("Batch is required");
        }
        String value = batch.trim();
        if (value.length() > 20) {
            throw new BadRequestException("Batch cannot exceed 20 characters");
        }
        return value;
    }

    /** Live ACTIVE/DISABLED students whose batch is the value or ends with "-value" (the graduation year). */
    private Specification<StudentProfile> batchArchiveSpecification(String batch, String departmentCode) {
        return (root, query, cb) -> {
            Join<StudentProfile, User> user = root.join("user", JoinType.INNER);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(user.get("isDeleted"), false));
            predicates.add(root.get("lifecycleStatus").in(LifecycleStatus.ACTIVE, LifecycleStatus.DISABLED));
            predicates.add(cb.or(cb.equal(root.get("batch"), batch), cb.like(root.get("batch"), "%-" + batch)));
            if (departmentCode != null) {
                predicates.add(cb.equal(cb.upper(root.get("departmentCode")), departmentCode));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean isDeleted(StudentProfile profile) {
        return profile.getUser() != null && Boolean.TRUE.equals(profile.getUser().getIsDeleted());
    }

    /** A new student: login account (password = register number) plus an empty profile awaiting setup. */
    private StudentProfile createProvisionedStudent(String registerNumber, Department department, Integer year) {
        String placeholderEmail = StudentIdentity.placeholderEmail(registerNumber);
        User user = userRepository.save(User.builder()
                .email(placeholderEmail)
                .passwordHash(passwordEncoder.encode(registerNumber))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(false)
                .mustChangePassword(true)
                .build());

        return studentProfileRepository.save(StudentProfile.builder()
                .user(user)
                .rollNo(registerNumber)
                // The student replaces both of these at first login.
                .fullName(registerNumber)
                .email(placeholderEmail)
                .college("GCE Srirangam")
                .department(department.getName())
                .departmentCode(department.getCode())
                .batch(StudentIdentity.batchForYear(year))
                .profileSetupCompleted(false)
                .build());
    }

    private StudentProfile findLiveStudent(Long id, StudentScope scope) {
        StudentProfile profile = studentProfileRepository.findById(id)
                .filter(scope::allows)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + id));
        if (profile.getUser() != null && Boolean.TRUE.equals(profile.getUser().getIsDeleted())) {
            throw new ResourceNotFoundException("Student with ID " + id + " has been deleted");
        }
        return profile;
    }

    private void forgetCachedUser(User user, String oldEmail) {
        tokenProvider.evictUser(user.getId(), oldEmail);
        tokenProvider.evictUser(user.getId(), user.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportStudentsCsv(String search, String department, PlacementStatus status) {
        Specification<StudentProfile> spec = createStudentSpecification(
                new StudentListFilter(search, department, status, null, null, null, null), StudentScope.officer());
        List<StudentProfile> students = studentProfileRepository.findAll(spec, Sort.by(Sort.Direction.ASC, "rollNo", "fullName"));

        Map<Long, String> companyNames = fetchCompanyNames(students);

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        csv.append('\uFEFF');

        // Headers
        csv.append("ID,Register / Roll No,Full Name,Email,Phone,Department,Degree,Batch,Semester,CGPA,Placement Status,Placed Company,Placed CTC,Placed On,Profile Completion %,Active Backlogs,Registered At\n");

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (StudentProfile s : students) {
            String company = companyNames.getOrDefault(s.getPlacedCompanyId(), "");
            String registeredAt = s.getCreatedAt() != null ? s.getCreatedAt().format(dateFmt) : "";

            csv.append(s.getId()).append(",")
                    .append(escapeCsv(s.getRollNo())).append(",")
                    .append(escapeCsv(s.getFullName())).append(",")
                    .append(escapeCsv(StudentIdentity.visibleEmail(s.getEmail()))).append(",")
                    .append(escapeCsv(s.getPhone())).append(",")
                    .append(escapeCsv(s.getDepartment())).append(",")
                    .append(escapeCsv(s.getDegree())).append(",")
                    .append(escapeCsv(s.getBatch())).append(",")
                    .append(s.getSemester() != null ? s.getSemester() : "").append(",")
                    .append(s.getCgpa() != null ? s.getCgpa().toString() : "").append(",")
                    .append(escapeCsv(s.getPlacementStatus() != null ? s.getPlacementStatus().name() : "")).append(",")
                    .append(escapeCsv(company)).append(",")
                    .append(s.getPlacedCtc() != null ? s.getPlacedCtc().toString() : "").append(",")
                    .append(s.getPlacedOn() != null ? s.getPlacedOn().format(dateFmt) : "").append(",")
                    .append(s.getProfileCompletionPercent() != null ? s.getProfileCompletionPercent() : 0).append(",")
                    .append(s.getActiveBacklogs() != null ? s.getActiveBacklogs() : 0).append(",")
                    .append(registeredAt).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // Helper methods
    private Specification<StudentProfile> createStudentSpecification(StudentListFilter filter, StudentScope scope) {
        String search = filter.search();
        String department = filter.department();
        PlacementStatus status = filter.status();
        BigDecimal minCgpa = filter.minCgpa();
        Set<LifecycleStatus> lifecycles = lifecycleFilter(filter.lifecycle());

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // The list reads each student's user account (status, active flag). Fetching it, and the
            // two inverse profile links Hibernate would otherwise load one query at a time per user,
            // turns ~3 queries per student into none. The count query only needs a plain join.
            boolean countQuery = Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType());
            Join<StudentProfile, User> userJoin;
            if (countQuery) {
                userJoin = root.join("user", JoinType.LEFT);
            } else {
                Fetch<StudentProfile, User> userFetch = root.fetch("user", JoinType.LEFT);
                userFetch.fetch("adminProfile", JoinType.LEFT);
                userFetch.fetch("studentProfile", JoinType.LEFT);
                @SuppressWarnings("unchecked")
                Join<StudentProfile, User> fetched = (Join<StudentProfile, User>) userFetch;
                userJoin = fetched;
            }

            // Exclude soft-deleted users
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

            // Scope: a faculty advisor only ever sees their own department.
            if (scope.isDepartmentScoped()) {
                predicates.add(cb.equal(cb.upper(root.get("departmentCode")), scope.departmentCode()));
            }

            // Lifecycle: archived students are hidden unless asked for.
            if (lifecycles != null) {
                predicates.add(root.get("lifecycleStatus").in(lifecycles));
            }

            if (filter.verificationStatus() != null) {
                predicates.add(cb.equal(root.get("profileVerificationStatus"), filter.verificationStatus()));
            }

            if (StringUtils.hasText(filter.batch())) {
                String batch = filter.batch().trim();
                predicates.add(cb.or(cb.equal(root.get("batch"), batch), cb.like(root.get("batch"), "%-" + batch)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** null = every lifecycle (ALL); default (blank) = ACTIVE and DISABLED. */
    private static Set<LifecycleStatus> lifecycleFilter(String lifecycle) {
        if (!StringUtils.hasText(lifecycle)) {
            return EnumSet.of(LifecycleStatus.ACTIVE, LifecycleStatus.DISABLED);
        }
        String value = lifecycle.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(value)) {
            return null;
        }
        try {
            return EnumSet.of(LifecycleStatus.valueOf(value));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("lifecycle must be ACTIVE, DISABLED, ARCHIVED or ALL");
        }
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
                .email(StudentIdentity.visibleEmail(p.getEmail()))
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
                .profileSetupCompleted(p.getProfileSetupCompleted())
                .accountStatus(u != null ? u.getAccountStatus() : null)
                .isActive(u != null ? u.getIsActive() : true)
                .isDeleted(u != null ? u.getIsDeleted() : false)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .lifecycleStatus(p.effectiveLifecycle())
                .archivedAt(p.getArchivedAt())
                .profileVerificationStatus(p.getProfileVerificationStatus())
                .profileVerifiedAt(p.getProfileVerifiedAt())
                .githubUrl(p.getGithubUrl())
                .linkedinUrl(p.getLinkedinUrl())
                .portfolioUrl(p.getPortfolioUrl())
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
                .filter(a -> ApplicationStatus.SHORTLISTED.equals(a.getStatus())
                        || ApplicationStatus.INTERVIEW.equals(a.getStatus())
                        || ApplicationStatus.SELECTED.equals(a.getStatus()))
                .count();

        return StudentDetailDto.builder()
                .id(profile.getId())
                .userId(user != null ? user.getId() : null)
                .rollNo(profile.getRollNo())
                .fullName(profile.getFullName())
                .email(StudentIdentity.visibleEmail(profile.getEmail()))
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
                .githubUrl(profile.getGithubUrl())
                .linkedinUrl(profile.getLinkedinUrl())
                .portfolioUrl(profile.getPortfolioUrl())
                .certifications(certificationRepository.findByStudentProfileIdOrderByIdAsc(profileId).stream()
                        .map(c -> new ProfileData.CertificationItem(c.getId(), c.getName(), c.getIssuer(), c.getIssueDate(),
                                c.getExpiryDate(), c.getCredentialId(), c.getCredentialUrl(), c.getFileUrl()))
                        .toList())
                .achievements(achievementRepository.findByStudentProfileIdOrderByIdAsc(profileId).stream()
                        .map(a -> new ProfileData.AchievementItem(a.getId(), a.getTitle(), a.getDescription(),
                                a.getAchievedOn(), a.getFileUrl()))
                        .toList())
                .documents(documentRepository.findByStudentId(profileId).stream()
                        .filter(d -> d.getDocumentType() != DocumentType.RESUME)
                        .map(d -> new ProfileData.DocumentItem(d.getId(), d.getDocumentName(), d.getDocumentType().name(),
                                d.getFileUrl(), d.getFileSize()))
                        .toList())
                .lifecycleStatus(profile.effectiveLifecycle())
                .archivedAt(profile.getArchivedAt())
                .archiveReason(profile.getArchiveReason())
                .profileVerificationStatus(profile.getProfileVerificationStatus())
                .profileVerifiedAt(profile.getProfileVerifiedAt())
                .pendingVersionId(versionRepository.findFirstByStudentIdAndStatusInOrderByVersionNumberDesc(profileId,
                                java.util.EnumSet.of(com.gces.placementcell.entity.enums.ProfileVersionStatus.PENDING))
                        .map(com.gces.placementcell.entity.StudentProfileVersion::getId).orElse(null))
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

    /**
     * Quotes a value for CSV and neutralises spreadsheet formulas.
     *
     * Students write their own name, phone and similar fields, and this report is
     * opened in Excel. A value starting with = + - @ (or a tab/CR that Excel strips
     * first) is evaluated as a formula, so "=HYPERLINK(...)" in a name would run
     * on the officer's machine. Prefixing an apostrophe makes Excel show it as
     * text (OWASP CSV injection guidance).
     */
    static String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String clean = value.replace("\r", " ").replace("\n", " ");
        if (!clean.isEmpty() && "=+-@\t".indexOf(clean.charAt(0)) >= 0) {
            clean = "'" + clean;
        }
        if (clean.contains(",") || clean.contains("\"") || clean.contains(";") || clean.startsWith("'")) {
            return "\"" + clean.replace("\"", "\"\"") + "\"";
        }
        return clean;
    }
}
