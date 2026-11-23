package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.DepartmentRequest;
import com.gces.placementcell.dto.request.DepartmentUpdateRequest;
import com.gces.placementcell.dto.request.CreateFacultyRequest;
import com.gces.placementcell.dto.response.DepartmentCreateResponse;
import com.gces.placementcell.dto.response.DepartmentResponse;
import com.gces.placementcell.dto.response.FacultyCredentialsResponse;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.exception.ConflictException;
import com.gces.placementcell.repository.FacultyProfileRepository;
import java.util.stream.Collectors;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.DepartmentRepository;
import com.gces.placementcell.repository.JobEligibleDepartmentRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The college's departments. Admins add a department when the college starts one, rename it, retire
 * it, and delete it only while nothing refers to it, so student and job records never point at a
 * department that no longer exists.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobEligibleDepartmentRepository jobEligibleDepartmentRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final FacultyService facultyService;
    private final AuditService auditService;

    @Transactional
    public List<DepartmentResponse> list() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : studentProfileRepository.countStudentsByDepartmentCode()) {
            counts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        addRowsForCodesStudentsAlreadyUse(counts.keySet());
        List<Department> departments = departmentRepository.findAllByOrderByCodeAsc();
        Map<Long, List<FacultyProfile>> advisors = facultyProfileRepository
                .findLiveByDepartmentIds(departments.stream().map(Department::getId).toList()).stream()
                .collect(Collectors.groupingBy(f -> f.getDepartment().getId()));
        return departments.stream()
                .map(d -> DepartmentResponse.from(d, counts.getOrDefault(d.getCode(), 0L),
                        facultyService.advisorOf(advisors.getOrDefault(d.getId(), List.of()))))
                .toList();
    }

    /** Creates the department and, when asked, its faculty advisor account, in one transaction. */
    @Transactional
    public DepartmentCreateResponse createWithFaculty(DepartmentRequest request) {
        DepartmentResponse department = create(request);
        if (!Boolean.TRUE.equals(request.createFacultyAccount())) {
            return new DepartmentCreateResponse(department, null, null);
        }
        String name = request.facultyName() == null || request.facultyName().isBlank()
                ? department.code() + " Faculty Advisor" : request.facultyName().trim();
        FacultyCredentialsResponse created = facultyService.create(new CreateFacultyRequest(
                name, request.facultyEmail(), null, "Faculty Advisor", department.id(), false));
        Department saved = find(department.id());
        return new DepartmentCreateResponse(
                DepartmentResponse.from(saved, 0, facultyProfileRepository.findById(created.faculty().id()).orElse(null)),
                created.faculty(), created.temporaryPassword());
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        String name = request.name().trim();
        if (departmentRepository.existsByCodeIgnoreCase(code)) {
            throw new DuplicateResourceException("A department with code " + code + " already exists");
        }
        if (departmentRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("A department named '" + name + "' already exists");
        }
        Department saved = departmentRepository.save(Department.builder().code(code).name(name).build());
        auditService.record("DEPARTMENT_CREATE", "DEPARTMENT", saved.getId(), "code=" + code + ", name=" + name);
        log.info("Department created: {}", code);
        return DepartmentResponse.from(saved, 0);
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentUpdateRequest request) {
        Department department = find(id);
        if (request.name() != null) {
            String name = request.name().trim();
            departmentRepository.findByNameIgnoreCase(name)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new DuplicateResourceException("A department named '" + name + "' already exists");
                    });
            department.setName(name);
        }
        if (request.isActive() != null) {
            department.setIsActive(request.isActive());
        }
        Department saved = departmentRepository.save(department);
        auditService.record("DEPARTMENT_UPDATE", "DEPARTMENT", saved.getId(),
                "name=" + saved.getName() + ", active=" + saved.getIsActive());
        log.info("Department updated: {} (active={})", saved.getCode(), saved.getIsActive());
        // Deactivating keeps the faculty assignment.
        return DepartmentResponse.from(saved, studentCount(saved.getCode()),
                facultyService.advisorOf(facultyProfileRepository.findLiveByDepartmentId(saved.getId())));
    }

    /**
     * Only a department nothing refers to can be deleted (409 with counts otherwise, so history stays
     * intact; deactivate it instead). Its faculty advisor is unassigned and disabled.
     */
    @Transactional
    public void delete(Long id) {
        Department department = find(id);
        long students = studentProfileRepository.countByDepartmentCodeIgnoreCase(department.getCode());
        long jobs = jobEligibleDepartmentRepository.countJobsByDepartmentCode(department.getCode());
        if (students > 0 || jobs > 0) {
            throw new ConflictException("Department " + department.getCode() + " is used by " + students
                    + " student(s) and " + jobs + " job drive(s) and cannot be deleted. "
                    + "Deactivate it instead so their history is preserved.");
        }
        facultyService.unassignAndDisable(department);
        facultyProfileRepository.flush();
        departmentRepository.delete(department);
        auditService.record("DEPARTMENT_DELETE", "DEPARTMENT", department.getId(), "code=" + department.getCode());
        log.info("Department deleted: {}", department.getCode());
    }

    /**
     * Finds a department from what an admin or an older client sent: its code (CSE), its name, or the
     * old "Computer Science (CSE)" form. Throws a message that says how to fix it when it is unknown.
     */
    @Transactional(readOnly = true)
    public Department resolve(String codeOrName) {
        String value = codeOrName == null ? "" : codeOrName.trim();
        if (value.isEmpty()) {
            throw new BadRequestException("Department is required");
        }
        return departmentRepository.findByCodeIgnoreCase(value)
                .or(() -> departmentRepository.findByNameIgnoreCase(value))
                .or(() -> {
                    String embedded = StudentIdentity.departmentCode(value);
                    return embedded == null ? java.util.Optional.empty() : departmentRepository.findByCodeIgnoreCase(embedded);
                })
                .orElseThrow(() -> new BadRequestException(
                        "Unknown department '" + value + "'. Add it under Departments first."));
    }

    /** Like {@link #resolve} but also refuses a department that has been switched off. */
    @Transactional(readOnly = true)
    public Department requireActive(String codeOrName) {
        Department department = resolve(codeOrName);
        if (!Boolean.TRUE.equals(department.getIsActive())) {
            throw new BadRequestException("Department " + department.getCode()
                    + " is inactive. Reactivate it under Departments to add students to it.");
        }
        return department;
    }

    /**
     * Students created before departments were managed carry free-text codes (for example IT). Give each
     * such code a department row, named after the students' own wording, so those students stay valid
     * and editable. Does nothing once every code has a row.
     */
    private void addRowsForCodesStudentsAlreadyUse(java.util.Collection<String> codesInUse) {
        for (String code : codesInUse) {
            if (code == null || code.isBlank() || departmentRepository.existsByCodeIgnoreCase(code)) {
                continue;
            }
            String normalized = code.trim().toUpperCase(Locale.ROOT);
            if (!normalized.matches("^[A-Z][A-Z0-9]{1,9}$")) {
                continue; // not usable as a department code; leave those students alone
            }
            String name = studentProfileRepository.findDepartmentNamesByCode(normalized).stream()
                    .filter(n -> n != null && !n.isBlank())
                    .map(String::trim)
                    .findFirst()
                    .orElse(normalized);
            if (departmentRepository.existsByNameIgnoreCase(name)) {
                name = name + " (" + normalized + ")";
            }
            departmentRepository.save(Department.builder().code(normalized).name(name).build());
            log.info("Department {} added from existing student records.", normalized);
        }
    }

    private long studentCount(String code) {
        return studentProfileRepository.countStudentsByDepartmentCode().stream()
                .filter(row -> code.equalsIgnoreCase(String.valueOf(row[0])))
                .mapToLong(row -> ((Number) row[1]).longValue())
                .findFirst()
                .orElse(0L);
    }

    private Department find(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
    }
}
