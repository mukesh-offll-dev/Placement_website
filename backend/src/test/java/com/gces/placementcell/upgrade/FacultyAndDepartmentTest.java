package com.gces.placementcell.upgrade;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobEligibleDepartment;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.repository.AuditLogRepository;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobEligibleDepartmentRepository;
import com.gces.placementcell.repository.JobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Faculty accounts, department scoping and department management. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Faculty advisors and departments")
class FacultyAndDepartmentTest extends UpgradeTestSupport {

    @Autowired private CompanyRepository companyRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private JobEligibleDepartmentRepository jobEligibleDepartmentRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private ObjectNode login(String email, String password) {
        return json.createObjectNode().put("email", email).put("password", password);
    }

    @Test
    @DisplayName("A CSE advisor cannot see or act on ECE students and is locked out of /admin and /student")
    void facultyIsScopedToOwnDepartment() throws Exception {
        Department cse = newDepartment();
        Department ece = newDepartment();
        Actor advisor = faculty(cse);
        Actor eceAdvisor = faculty(ece);
        Student mine = student(cse);
        Student theirs = student(ece);

        call(get("/faculty/students/" + mine.id()), advisor.token(), null, 200);
        call(get("/faculty/students/" + theirs.id()), advisor.token(), null, 404);
        call(put("/faculty/students/" + theirs.id()), advisor.token(), json.createObjectNode().put("fullName", "X"), 404);
        call(delete("/faculty/students/" + theirs.id()), advisor.token(), null, 404);

        JsonNode list = call(get("/faculty/students").param("search", theirs.profile().getRollNo()), advisor.token(), null, 200);
        assertEquals(0, list.path("data").path("totalElements").asInt());
        JsonNode ids = call(get("/faculty/students/ids"), advisor.token(), null, 200).path("data");
        assertEquals(1, ids.size());
        assertEquals(mine.id(), ids.get(0).asLong());

        // An ECE verification request is invisible to the CSE advisor.
        call(put("/student/profile/draft"), theirs.token(), draftBody("8.80", null, null), 200);
        long versionId = call(post("/student/profile/draft/submit"), theirs.token(), null, 200).path("data").path("versionId").asLong();
        call(get("/faculty/verifications/" + versionId), advisor.token(), null, 404);
        call(post("/faculty/verifications/" + versionId + "/approve"), advisor.token(), null, 404);
        assertEquals(0, call(get("/faculty/verifications"), advisor.token(), null, 200).path("data").path("totalElements").asInt());
        call(get("/faculty/verifications/" + versionId), eceAdvisor.token(), null, 200);

        ObjectNode bulk = json.createObjectNode().put("action", "DISABLE");
        bulk.putArray("studentIds").add(mine.id()).add(theirs.id());
        JsonNode result = call(post("/faculty/students/bulk"), advisor.token(), bulk, 200).path("data");
        assertEquals(1, result.path("succeeded").asInt());
        assertEquals(theirs.id(), result.path("failed").get(0).path("studentId").asLong());
        assertEquals("Not found", result.path("failed").get(0).path("reason").asText());
        assertTrue(userRepository.findById(theirs.user().getId()).orElseThrow().getIsActive(), "ECE student untouched");

        call(get("/admin/students"), advisor.token(), null, 403);
        call(get("/admin/departments"), advisor.token(), null, 403);
        call(get("/student/profile"), advisor.token(), null, 403);
        call(get("/faculty/me"), student(cse).token(), null, 403);
        call(get("/faculty/me"), admin().token(), null, 403);

        Actor unassigned = faculty(null);
        call(get("/faculty/students"), unassigned.token(), null, 403);
        assertEquals(cse.getCode(), call(get("/faculty/me"), advisor.token(), null, 200)
                .path("data").path("department").path("code").asText());
        JsonNode dashboard = call(get("/faculty/dashboard"), advisor.token(), null, 200).path("data");
        assertEquals(cse.getCode(), dashboard.path("department").path("code").asText());
        assertEquals(1, dashboard.path("disabledStudents").asInt());
    }

    @Test
    @DisplayName("Department with advisor: temporary password once, forced change, disable/enable, reset, one advisor per department")
    void facultyAccountLifecycle() throws Exception {
        Actor admin = admin();
        String code = newDepartment().getCode();
        departmentRepository.findByCodeIgnoreCase(code).ifPresent(departmentRepository::delete);

        ObjectNode create = json.createObjectNode().put("code", code).put("name", "Created " + code)
                .put("createFacultyAccount", true).put("facultyName", "Dr. Ada");
        JsonNode created = call(post("/admin/departments"), admin.token(), create, 201).path("data");
        String temp = created.path("temporaryPassword").asText();
        assertEquals(12, temp.length());
        String email = created.path("faculty").path("email").asText();
        assertEquals(code.toLowerCase() + ".advisor@faculty.gces.local", email);
        long facultyId = created.path("faculty").path("id").asLong();
        long deptId = created.path("department").path("id").asLong();
        assertEquals("Dr. Ada", created.path("department").path("facultyAdvisor").path("fullName").asText());

        // Never returned again, never logged in the audit trail.
        String listed = call(get("/admin/faculty"), admin.token(), null, 200).toString();
        assertFalse(listed.contains(temp));
        assertTrue(auditLogRepository.findAll().stream().noneMatch(a -> a.getDetails() != null && a.getDetails().contains(temp)));
        assertTrue(auditLogRepository.findByEntityTypeAndEntityIdOrderByIdAsc("FACULTY", facultyId).stream()
                .anyMatch(a -> "FACULTY_CREATE".equals(a.getAction())));

        JsonNode first = call(post("/auth/login"), null, login(email, temp), 200).path("data");
        assertTrue(first.path("passwordChangeRequired").asBoolean());
        String token = first.path("token").asText();
        JsonNode blocked = call(get("/faculty/dashboard"), token, null, 403);
        assertEquals("PASSWORD_CHANGE_REQUIRED", blocked.path("code").asText());
        call(get("/auth/me"), token, null, 200);
        call(post("/auth/change-password"), token,
                json.createObjectNode().put("currentPassword", "wrong").put("newPassword", "Better@2026x"), 400);
        call(post("/auth/change-password"), token,
                json.createObjectNode().put("currentPassword", temp).put("newPassword", "short"), 400);
        JsonNode changed = call(post("/auth/change-password"), token,
                json.createObjectNode().put("currentPassword", temp).put("newPassword", "Better@2026x"), 200).path("data");
        assertFalse(changed.path("passwordChangeRequired").asBoolean());
        call(get("/faculty/dashboard"), changed.path("token").asText(), null, 200);
        call(get("/faculty/dashboard"), token, null, 401);

        // Disable -> cannot sign in; enable -> can.
        call(patch("/admin/faculty/" + facultyId + "/disable"), admin.token(), null, 200);
        call(post("/auth/login"), null, login(email, "Better@2026x"), 403);
        call(patch("/admin/faculty/" + facultyId + "/enable"), admin.token(), null, 200);
        call(post("/auth/login"), null, login(email, "Better@2026x"), 200);

        // Reset issues a new temporary password and forces a change again.
        String reset = call(post("/admin/faculty/" + facultyId + "/reset-password"), admin.token(), null, 200)
                .path("data").path("temporaryPassword").asText();
        call(post("/auth/login"), null, login(email, "Better@2026x"), 401);
        assertTrue(call(post("/auth/login"), null, login(email, reset), 200).path("data").path("passwordChangeRequired").asBoolean());

        // One active advisor per department.
        ObjectNode second = json.createObjectNode().put("fullName", "Second Advisor").put("departmentId", deptId);
        call(post("/admin/faculty"), admin.token(), second, 409);
        second.put("replaceExisting", true).put("email", "second." + tag() + "@gces.edu");
        JsonNode replaced = call(post("/admin/faculty"), admin.token(), second, 201).path("data");
        assertEquals(deptId, replaced.path("faculty").path("department").path("id").asLong());
        assertNull(facultyProfileRepository.findById(facultyId).orElseThrow().getDepartment(), "previous advisor unassigned");

        // Placement officers cannot manage faculty or departments.
        Actor officer = officer();
        call(get("/admin/faculty"), officer.token(), null, 403);
        call(post("/admin/departments"), officer.token(), json.createObjectNode().put("code", "QQ").put("name", "Nope Dept"), 403);
        call(get("/admin/departments"), officer.token(), null, 200);
    }

    @Test
    @DisplayName("Advisor manages students of their own department only (department forced)")
    void facultyStudentCrud() throws Exception {
        Department dept = newDepartment();
        Department other = newDepartment();
        Actor advisor = faculty(dept);
        String roll = String.format("7%011d", System.nanoTime() % 100_000_000_000L);

        JsonNode created = call(post("/faculty/students/provision"), advisor.token(),
                json.createObjectNode().put("registerNumber", roll).put("department", other.getCode()).put("year", 2027), 201)
                .path("data");
        assertEquals(dept.getCode(), created.path("departmentCode").asText(), "department is forced");
        long id = created.path("id").asLong();

        String from = String.format("6%011d", System.nanoTime() % 100_000_000_000L);
        String to = from.substring(0, 11) + (char) (from.charAt(11) == '9' ? '9' : from.charAt(11) + 1);
        JsonNode bulk = call(post("/faculty/students/provision/bulk"), advisor.token(),
                json.createObjectNode().put("registerNumberFrom", from).put("registerNumberTo", to).put("year", 2027), 201).path("data");
        assertTrue(bulk.path("created").asInt() >= 1);

        JsonNode updated = call(put("/faculty/students/" + id), advisor.token(),
                json.createObjectNode().put("fullName", "Renamed Student").put("department", other.getCode()), 200).path("data");
        assertEquals("Renamed Student", updated.path("fullName").asText());
        assertEquals(dept.getCode(), updated.path("departmentCode").asText());

        assertEquals("DISABLED", call(patch("/faculty/students/" + id + "/deactivate"), advisor.token(), null, 200)
                .path("data").path("lifecycleStatus").asText());
        assertEquals("ACTIVE", call(patch("/faculty/students/" + id + "/reactivate"), advisor.token(), null, 200)
                .path("data").path("lifecycleStatus").asText());
        call(post("/faculty/students/" + id + "/reset-password"), advisor.token(), null, 200);
        call(delete("/faculty/students/" + id), advisor.token(), null, 200);
        call(get("/faculty/students/" + id), advisor.token(), null, 404);
        assertTrue(auditLogRepository.findByEntityTypeAndEntityIdOrderByIdAsc("STUDENT", id).stream()
                .map(a -> a.getAction()).toList().containsAll(java.util.List.of(
                        "STUDENT_PROVISION", "STUDENT_UPDATE", "STUDENT_DISABLE", "STUDENT_ENABLE",
                        "STUDENT_RESET_PASSWORD", "STUDENT_DELETE")));
    }

    @Test
    @DisplayName("Department delete: refused (409) while students or jobs use it; otherwise deleted and its advisor unassigned and disabled")
    void departmentDelete() throws Exception {
        Actor admin = admin();
        Department withStudent = newDepartment();
        Student s = student(withStudent);
        call(delete("/admin/departments/" + withStudent.getId()), admin.token(), null, 409);
        // Even a deleted student keeps the department referenced (history preserved).
        call(delete("/admin/students/" + s.id()), admin.token(), null, 200);
        assertTrue(call(delete("/admin/departments/" + withStudent.getId()), admin.token(), null, 409)
                .path("message").asText().contains("1 student"));

        Department withJob = newDepartment();
        Company company = companyRepository.save(Company.builder().name("Co " + tag()).build());
        Job job = jobRepository.save(Job.builder().company(company).jobRole("SDE").jobType(EmploymentType.FULL_TIME)
                .applicationDeadline(LocalDate.now().plusDays(5)).status(JobStatus.ACTIVE).isActive(true)
                .ctcValue(new BigDecimal("100000.00")).postedBy(admin.user()).build());
        jobEligibleDepartmentRepository.save(JobEligibleDepartment.builder().job(job).departmentCode(withJob.getCode()).build());
        call(delete("/admin/departments/" + withJob.getId()), admin.token(), null, 409);

        Department empty = newDepartment();
        Actor advisor = faculty(empty);
        long facultyId = facultyProfileRepository.findByUserId(advisor.user().getId()).orElseThrow().getId();
        call(delete("/admin/departments/" + empty.getId()), officer().token(), null, 403);
        call(delete("/admin/departments/" + empty.getId()), admin.token(), null, 200);
        assertTrue(departmentRepository.findById(empty.getId()).isEmpty());
        var faculty = facultyProfileRepository.findById(facultyId).orElseThrow();
        assertNull(faculty.getDepartment());
        assertFalse(userRepository.findById(advisor.user().getId()).orElseThrow().getIsActive());
        assertTrue(auditLogRepository.findByEntityTypeAndEntityIdOrderByIdAsc("DEPARTMENT", empty.getId()).stream()
                .anyMatch(a -> "DEPARTMENT_DELETE".equals(a.getAction())));
    }
}
