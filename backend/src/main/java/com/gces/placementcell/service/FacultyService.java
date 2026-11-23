package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.CreateFacultyRequest;
import com.gces.placementcell.dto.request.UpdateFacultyRequest;
import com.gces.placementcell.dto.response.FacultyCredentialsResponse;
import com.gces.placementcell.dto.response.FacultyDto;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ConflictException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.DepartmentRepository;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.LoginAttemptLimiter;
import com.gces.placementcell.security.TokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

/**
 * Faculty advisor accounts. At most one advisor with a live, active login per department; assigning
 * to an occupied department needs replaceExisting, which unassigns the previous advisor. Temporary
 * passwords are returned once and never stored or logged in plain text.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FacultyService {

    public static final String GENERATED_DOMAIN = "@faculty.gces.local";

    private final FacultyProfileRepository facultyProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final LoginAttemptLimiter loginAttemptLimiter;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<FacultyDto> list() {
        return facultyProfileRepository.findAllLive().stream().map(FacultyDto::from).toList();
    }

    @Transactional
    public FacultyCredentialsResponse create(CreateFacultyRequest request) {
        Department department = request.departmentId() == null ? null : findDepartment(request.departmentId());
        if (department != null) {
            claimDepartment(department, null, Boolean.TRUE.equals(request.replaceExisting()));
        }
        String email = StringUtils.hasText(request.email())
                ? requireFreeEmail(request.email(), null)
                : generatedEmail(department);
        String temporaryPassword = TemporaryPasswords.generate();
        User user = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .role(UserRole.FACULTY_ADVISOR)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(false)
                .isDeleted(false)
                .mustChangePassword(true)
                .build());
        FacultyProfile faculty = facultyProfileRepository.save(FacultyProfile.builder()
                .user(user)
                .department(department)
                .fullName(request.fullName().trim())
                .phone(blankToNull(request.phone()))
                .designation(blankToNull(request.designation()))
                .build());
        auditService.record("FACULTY_CREATE", "FACULTY", faculty.getId(),
                "email=" + email + (department != null ? ", department=" + department.getCode() : ", unassigned"));
        log.info("Faculty advisor created: id={} department={}", faculty.getId(),
                department != null ? department.getCode() : "-");
        return new FacultyCredentialsResponse(FacultyDto.from(faculty), temporaryPassword);
    }

    @Transactional
    public FacultyDto update(Long id, UpdateFacultyRequest request) {
        FacultyProfile faculty = find(id);
        User user = faculty.getUser();
        String oldEmail = user.getEmail();
        String email = requireFreeEmail(request.email(), user.getId());
        user.setEmail(email);
        faculty.setFullName(request.fullName().trim());
        faculty.setPhone(blankToNull(request.phone()));
        faculty.setDesignation(blankToNull(request.designation()));

        Department current = faculty.getDepartment();
        Department target = request.departmentId() == null ? null : findDepartment(request.departmentId());
        boolean moved = !java.util.Objects.equals(current == null ? null : current.getId(),
                target == null ? null : target.getId());
        if (moved && target != null && Boolean.TRUE.equals(user.getIsActive())) {
            claimDepartment(target, faculty.getId(), Boolean.TRUE.equals(request.replaceExisting()));
        }
        faculty.setDepartment(target);
        userRepository.save(user);
        facultyProfileRepository.save(faculty);
        tokenProvider.evictUser(user.getId(), oldEmail);
        tokenProvider.evictUser(user.getId(), email);

        auditService.record("FACULTY_UPDATE", "FACULTY", faculty.getId(), "email=" + email);
        if (moved) {
            auditService.record("FACULTY_ASSIGN", "FACULTY", faculty.getId(),
                    "department=" + (target != null ? target.getCode() : "none")
                            + (current != null ? ", previous=" + current.getCode() : ""));
        }
        return FacultyDto.from(faculty);
    }

    @Transactional
    public FacultyDto setEnabled(Long id, boolean enabled) {
        FacultyProfile faculty = find(id);
        User user = faculty.getUser();
        if (enabled && faculty.getDepartment() != null && !Boolean.TRUE.equals(user.getIsActive())) {
            // Re-enabling must not create a second active advisor for the department.
            boolean occupied = facultyProfileRepository.findLiveByDepartmentId(faculty.getDepartment().getId()).stream()
                    .anyMatch(other -> !other.getId().equals(faculty.getId()) && Boolean.TRUE.equals(other.getUser().getIsActive()));
            if (occupied) {
                throw new ConflictException("Department " + faculty.getDepartment().getCode()
                        + " already has an active faculty advisor. Unassign or disable them first.");
            }
        }
        user.setIsActive(enabled);
        user.setAccountStatus(enabled ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);
        userRepository.save(user);
        tokenProvider.evictUser(user.getId(), user.getEmail());
        auditService.record(enabled ? "FACULTY_ENABLE" : "FACULTY_DISABLE", "FACULTY", faculty.getId(), null);
        return FacultyDto.from(faculty);
    }

    @Transactional
    public FacultyCredentialsResponse resetPassword(Long id) {
        FacultyProfile faculty = find(id);
        User user = faculty.getUser();
        String temporaryPassword = TemporaryPasswords.generate();
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);
        loginAttemptLimiter.recordSuccess("em:" + user.getEmail());
        tokenProvider.evictUser(user.getId(), user.getEmail());
        auditService.record("FACULTY_RESET_PASSWORD", "FACULTY", faculty.getId(), "temporary password issued");
        return new FacultyCredentialsResponse(FacultyDto.from(faculty), temporaryPassword);
    }

    /** Called when a department is deleted: the advisor keeps the account but is unassigned and disabled. */
    @Transactional
    public void unassignAndDisable(Department department) {
        for (FacultyProfile faculty : facultyProfileRepository.findLiveByDepartmentId(department.getId())) {
            faculty.setDepartment(null);
            User user = faculty.getUser();
            user.setIsActive(false);
            user.setAccountStatus(AccountStatus.INACTIVE);
            userRepository.save(user);
            facultyProfileRepository.save(faculty);
            tokenProvider.evictUser(user.getId(), user.getEmail());
            auditService.record("FACULTY_DISABLE", "FACULTY", faculty.getId(),
                    "unassigned because department " + department.getCode() + " was deleted");
        }
    }

    /** The department's advisor to show: the active one if any, else any assigned live one. */
    @Transactional(readOnly = true)
    public FacultyProfile advisorOf(List<FacultyProfile> assigned) {
        return assigned.stream().filter(f -> Boolean.TRUE.equals(f.getUser().getIsActive())).findFirst()
                .orElse(assigned.isEmpty() ? null : assigned.get(0));
    }

    /**
     * Makes sure no other active advisor holds the department. With replaceExisting the current
     * holders are unassigned; without it the request is refused with 409.
     */
    private void claimDepartment(Department department, Long selfId, boolean replaceExisting) {
        List<FacultyProfile> holders = facultyProfileRepository.findLiveByDepartmentId(department.getId()).stream()
                .filter(f -> selfId == null || !f.getId().equals(selfId))
                .filter(f -> Boolean.TRUE.equals(f.getUser().getIsActive()))
                .toList();
        if (holders.isEmpty()) {
            return;
        }
        if (!replaceExisting) {
            throw new ConflictException("Department " + department.getCode() + " already has a faculty advisor ("
                    + holders.get(0).getFullName() + "). Set replaceExisting to reassign it.");
        }
        for (FacultyProfile previous : holders) {
            previous.setDepartment(null);
            facultyProfileRepository.save(previous);
            auditService.record("FACULTY_ASSIGN", "FACULTY", previous.getId(),
                    "unassigned from " + department.getCode() + " (replaced)");
        }
        facultyProfileRepository.flush();
    }

    private String requireFreeEmail(String raw, Long selfUserId) {
        String email = raw.trim().toLowerCase(Locale.ROOT);
        if (StudentIdentity.isPlaceholderEmail(email)) {
            throw new BadRequestException("Enter a real email address");
        }
        userRepository.findByEmail(email)
                .filter(other -> selfUserId == null || !other.getId().equals(selfUserId))
                .ifPresent(other -> {
                    throw new ConflictException("The email " + email + " is already in use");
                });
        return email;
    }

    /** "<code>.advisor@faculty.gces.local", with -2, -3 ... on a clash. Never emailed. */
    String generatedEmail(Department department) {
        String local = (department != null ? department.getCode().toLowerCase(Locale.ROOT) : "faculty") + ".advisor";
        String candidate = local + GENERATED_DOMAIN;
        int suffix = 2;
        while (userRepository.existsByEmail(candidate)) {
            candidate = local + "-" + suffix++ + GENERATED_DOMAIN;
        }
        return candidate;
    }

    private FacultyProfile find(Long id) {
        return facultyProfileRepository.findLiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty", "id", id));
    }

    private Department findDepartment(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
