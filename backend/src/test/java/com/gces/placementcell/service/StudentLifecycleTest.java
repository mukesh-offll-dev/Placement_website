package com.gces.placementcell.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.repository.AuditLogRepository;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.NotificationRecipientRepository;
import com.gces.placementcell.upgrade.UpgradeTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Student lifecycle: bulk actions, batch archive, exclusions for non-active students, audit log. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Student lifecycle, bulk actions and audit")
class StudentLifecycleTest extends UpgradeTestSupport {

    @Autowired private JobNotificationService jobNotificationService;
    @Autowired private JobRepository jobRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JobApplicationRepository applicationRepository;
    @Autowired private NotificationRecipientRepository recipientRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private ObjectNode bulk(String action, Long... ids) {
        ObjectNode body = json.createObjectNode().put("action", action);
        ArrayNode array = body.putArray("studentIds");
        for (Long id : ids) {
            array.add(id);
        }
        return body;
    }

    private LifecycleStatus lifecycle(Student s) {
        return studentProfileRepository.findById(s.id()).orElseThrow().getLifecycleStatus();
    }

    @Test
    @DisplayName("Bulk DELETE/DISABLE/ENABLE/ARCHIVE/RESTORE with skips, RESTORE admin-only, size limits, audit rows")
    void bulkActions() throws Exception {
        Department dept = newDepartment();
        Actor admin = admin();
        Actor officer = officer();
        Actor advisor = faculty(dept);
        Student a = student(dept);
        Student b = student(dept);
        Student c = student(dept);

        JsonNode disabled = call(post("/admin/students/bulk"), officer.token(), bulk("DISABLE", a.id(), b.id(), 99999999L), 200).path("data");
        assertEquals(3, disabled.path("requested").asInt());
        assertEquals(2, disabled.path("succeeded").asInt());
        assertEquals("Not found", disabled.path("failed").get(0).path("reason").asText());
        assertEquals(LifecycleStatus.DISABLED, lifecycle(a));
        assertFalse(userRepository.findById(a.user().getId()).orElseThrow().getIsActive());

        call(post("/admin/students/bulk"), advisor.token(), bulk("ENABLE", a.id()), 403);
        JsonNode enabled = call(post("/faculty/students/bulk"), advisor.token(), bulk("ENABLE", a.id(), c.id()), 200).path("data");
        assertEquals(1, enabled.path("succeeded").asInt());
        assertEquals(1, enabled.path("skipped").asInt(), "c was already active");
        assertEquals(LifecycleStatus.ACTIVE, lifecycle(a));

        call(post("/admin/students/bulk"), admin.token(), bulk("ARCHIVE", a.id()), 200);
        assertEquals(LifecycleStatus.ARCHIVED, lifecycle(a));
        JsonNode enableArchived = call(post("/admin/students/bulk"), admin.token(), bulk("ENABLE", a.id()), 200).path("data");
        assertEquals(1, enableArchived.path("skipped").asInt());
        assertTrue(enableArchived.path("skippedDetails").get(0).path("reason").asText().contains("restore"));

        call(post("/admin/students/bulk"), officer.token(), bulk("RESTORE", a.id()), 403);
        call(post("/faculty/students/bulk"), advisor.token(), bulk("RESTORE", a.id()), 403);
        assertEquals(1, call(post("/admin/students/bulk"), admin.token(), bulk("RESTORE", a.id()), 200)
                .path("data").path("succeeded").asInt());
        assertEquals(LifecycleStatus.ACTIVE, lifecycle(a));

        call(post("/faculty/students/bulk"), advisor.token(), bulk("DELETE", c.id()), 200);
        assertTrue(userRepository.findById(c.user().getId()).orElseThrow().getIsDeleted());

        // Validation: empty, too many, unknown action.
        call(post("/admin/students/bulk"), admin.token(), bulk("DISABLE"), 400);
        Long[] many = new Long[1001];
        for (int i = 0; i < many.length; i++) {
            many[i] = (long) i + 1;
        }
        call(post("/admin/students/bulk"), admin.token(), bulk("DISABLE", many), 400);
        call(post("/admin/students/bulk"), admin.token(), bulk("EXPLODE", a.id()), 400);

        var actions = auditLogRepository.findByEntityTypeAndEntityIdOrderByIdAsc("STUDENT", a.id()).stream()
                .map(l -> l.getAction()).toList();
        assertTrue(actions.containsAll(java.util.List.of("STUDENT_DISABLE", "STUDENT_ENABLE", "STUDENT_ARCHIVE", "STUDENT_RESTORE")), actions.toString());
    }

    @Test
    @DisplayName("Batch archive preview + execute; archived hidden by default, listed with lifecycle=ARCHIVED; restore")
    void batchArchive() throws Exception {
        Department dept = newDepartment();
        Actor admin = admin();
        String year = String.valueOf(2050 + (int) (Math.random() * 40));
        Student s1 = student(dept, "2046-" + year);
        Student s2 = student(dept, "2046-" + year);
        student(dept, "2020-2024");

        JsonNode preview = call(get("/admin/students/archive-batch/preview").param("batch", year)
                .param("departmentCode", dept.getCode()), admin.token(), null, 200).path("data");
        assertEquals(2, preview.path("count").asInt());
        call(get("/admin/students/archive-batch/preview").param("batch", year), officer().token(), null, 403);
        call(post("/admin/students/archive-batch"), officer().token(), json.createObjectNode().put("batch", year), 403);
        call(post("/admin/students/archive-batch"), admin.token(), json.createObjectNode().put("batch", ""), 400);

        JsonNode done = call(post("/admin/students/archive-batch"), admin.token(),
                json.createObjectNode().put("batch", year).put("departmentCode", dept.getCode()).put("reason", "Graduated"), 200).path("data");
        assertEquals(2, done.path("succeeded").asInt());
        assertEquals("Graduated", studentProfileRepository.findById(s1.id()).orElseThrow().getArchiveReason());

        int defaultCount = call(get("/admin/students").param("department", dept.getCode()), admin.token(), null, 200)
                .path("data").path("totalElements").asInt();
        assertEquals(1, defaultCount);
        assertEquals(2, call(get("/admin/students").param("department", dept.getCode()).param("lifecycle", "ARCHIVED"),
                admin.token(), null, 200).path("data").path("totalElements").asInt());
        assertEquals(3, call(get("/admin/students").param("department", dept.getCode()).param("lifecycle", "ALL"),
                admin.token(), null, 200).path("data").path("totalElements").asInt());
        assertEquals(2, call(get("/admin/students/ids").param("department", dept.getCode()).param("lifecycle", "ARCHIVED"),
                admin.token(), null, 200).path("data").size());
        call(get("/admin/students").param("lifecycle", "NOPE"), admin.token(), null, 400);
        assertTrue(auditLogRepository.findAll().stream().anyMatch(l -> "BATCH_ARCHIVE".equals(l.getAction())
                && l.getDetails().contains("batch=" + year)));

        call(post("/admin/students/bulk"), admin.token(), bulk("RESTORE", s2.id()), 200);
        assertEquals(LifecycleStatus.ACTIVE, lifecycle(s2));
    }

    @Test
    @DisplayName("Archived and disabled students: no job alerts, cannot apply or submit; history untouched")
    void nonActiveStudentsAreExcluded() throws Exception {
        Department dept = newDepartment();
        Actor admin = admin();
        Student active = student(dept);
        Student archived = student(dept);
        Student disabled = student(dept);
        Company company = companyRepository.save(Company.builder().name("Lifecycle Co " + tag()).build());
        Job first = jobRepository.save(Job.builder().company(company).jobRole("Analyst").jobType(EmploymentType.FULL_TIME)
                .ctcValue(new BigDecimal("500000.00")).applicationDeadline(LocalDate.now().plusDays(10))
                .status(JobStatus.ACTIVE).isActive(true).postedBy(admin.user()).build());

        // The future archived student applied while active and was placed.
        call(post("/student/applications"), archived.token(), json.createObjectNode().put("jobId", first.getId()).put("consentGiven", true), 201);
        var profile = studentProfileRepository.findById(archived.id()).orElseThrow();
        profile.setPlacementStatus(PlacementStatus.PLACED);
        profile.setPlacedCtc(new BigDecimal("500000.00"));
        studentProfileRepository.save(profile);

        call(post("/admin/students/bulk"), admin.token(), bulk("ARCHIVE", archived.id()), 200);
        call(post("/admin/students/bulk"), admin.token(), bulk("DISABLE", disabled.id()), 200);

        assertEquals(1, applicationRepository.findByStudentProfileId(archived.id()).size(), "applications kept");
        var after = studentProfileRepository.findById(archived.id()).orElseThrow();
        assertEquals(PlacementStatus.PLACED, after.getPlacementStatus());
        assertEquals(0, new BigDecimal("500000.00").compareTo(after.getPlacedCtc()));

        Job second = jobRepository.save(Job.builder().company(company).jobRole("Engineer").jobType(EmploymentType.FULL_TIME)
                .ctcValue(new BigDecimal("600000.00")).applicationDeadline(LocalDate.now().plusDays(10))
                .status(JobStatus.ACTIVE).isActive(true).postedBy(admin.user()).build());
        jobNotificationService.notifyEligibleStudents(second.getId());
        assertEquals(1, recipientRepository.findByUserIdOrderByCreatedAtDesc(active.user().getId(), PageRequest.of(0, 50))
                .getContent().stream().filter(r -> r.getNotification().getRelatedJob() != null
                        && second.getId().equals(r.getNotification().getRelatedJob().getId())).count());
        for (Student excluded : java.util.List.of(archived, disabled)) {
            assertEquals(0, recipientRepository.findByUserIdOrderByCreatedAtDesc(excluded.user().getId(), PageRequest.of(0, 50))
                    .getContent().stream().filter(r -> r.getNotification().getRelatedJob() != null
                            && second.getId().equals(r.getNotification().getRelatedJob().getId())).count());
        }

        // Archived: can sign in read-only, but cannot apply or submit.
        call(get("/student/applications"), archived.token(), null, 200);
        call(post("/student/applications"), archived.token(), json.createObjectNode().put("jobId", second.getId()).put("consentGiven", true), 403);
        call(put("/student/profile/draft"), archived.token(), draftBody("9.00", null, null), 403);
        call(post("/student/profile/draft/submit"), archived.token(), null, 403);
        assertFalse(call(get("/student/profile/draft"), archived.token(), null, 200).path("data").path("canEdit").asBoolean());
        // Disabled: the token no longer authenticates at all.
        call(post("/student/applications"), disabled.token(), json.createObjectNode().put("jobId", second.getId()).put("consentGiven", true), 401);
        call(post("/student/applications"), active.token(), json.createObjectNode().put("jobId", second.getId()).put("consentGiven", true), 201);
    }

    @Test
    @DisplayName("Audit log: admin only, newest first, no passwords")
    void auditLogEndpoint() throws Exception {
        Actor admin = admin();
        Department dept = newDepartment();
        Student s = student(dept);
        call(post("/admin/students/" + s.id() + "/reset-password"), admin.token(), null, 200);
        JsonNode page = call(get("/admin/audit-logs").param("entityType", "STUDENT").param("size", "50"),
                admin.token(), null, 200).path("data");
        assertTrue(page.path("totalElements").asLong() >= 1);
        JsonNode row = page.path("content").get(0);
        assertFalse(row.path("action").asText().isBlank());
        assertFalse(row.path("createdAt").isMissingNode());
        assertEquals(admin.user().getId(), row.path("actorUserId").asLong());
        assertFalse(page.toString().contains(PASSWORD));
        assertFalse(page.toString().contains(s.profile().getRollNo() + "\"password"));
        call(get("/admin/audit-logs"), officer().token(), null, 403);
        call(get("/admin/audit-logs"), faculty(dept).token(), null, 403);
        call(get("/admin/audit-logs"), student(dept).token(), null, 403);
        call(get("/admin/verifications"), officer().token(), null, 403);
        call(get("/admin/verifications"), admin.token(), null, 200);
    }
}
