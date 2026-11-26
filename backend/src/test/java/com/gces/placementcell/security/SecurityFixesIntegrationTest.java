package com.gces.placementcell.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end checks for the security fixes: admin self-registration bypass, project-media IDOR,
 * eligibility on apply, application status transitions, resume/file ownership, bearer-only tokens,
 * token revocation on password change and the uniform error body.
 *
 * Each test runs in a transaction that is rolled back, so nothing leaks into other test classes
 * sharing the in-memory database. MockMvc paths omit the /api context path, so "/api/auth/..."
 * here is the doubled "/api/api/auth/..." a real client would have to send.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Security fixes (integration)")
class SecurityFixesIntegrationTest {

    private static final String PASSWORD = "Password@123";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentProfileRepository studentProfileRepository;
    @Autowired private StudentProjectRepository projectRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private JobApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TokenProvider tokenProvider;

    private User admin;
    private StudentProfile studentA;
    private StudentProfile studentB;
    private String adminToken;
    private String studentAToken;
    private String studentBToken;
    private Company company;

    @BeforeEach
    void setUp() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        admin = saveUser("admin-" + tag + "@gces.edu", UserRole.ADMIN);
        User userA = saveUser("a-" + tag + "@gces.edu", UserRole.STUDENT);
        User userB = saveUser("b-" + tag + "@gces.edu", UserRole.STUDENT);
        studentA = saveProfile(userA, "A" + tag, new BigDecimal("7.00"));
        studentB = saveProfile(userB, "B" + tag, new BigDecimal("9.00"));
        adminToken = tokenProvider.generateToken(admin);
        studentAToken = tokenProvider.generateToken(userA);
        studentBToken = tokenProvider.generateToken(userB);
        company = companyRepository.save(Company.builder().name("Acme " + tag).build());
    }

    // ---------------------------------------------------------------- 1. admin registration

    @Test
    @DisplayName("A student cannot create an admin through /auth or the doubled /api/auth path")
    void studentCannotRegisterAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "email", "evil-" + UUID.randomUUID() + "@gces.edu", "password", "Password1",
                "fullName", "Evil", "role", "ADMIN"));

        mockMvc.perform(post("/auth/register/admin").header("Authorization", bearer(studentAToken))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/auth/register/admin").header("Authorization", bearer(studentAToken))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(result -> assertTrue(
                        result.getResponse().getStatus() == 403 || result.getResponse().getStatus() == 404,
                        "expected 403/404 but was " + result.getResponse().getStatus()));
        mockMvc.perform(post("/auth/register/admin").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("An admin can still create another admin")
    void adminCanRegisterAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "email", "new-" + UUID.randomUUID() + "@gces.edu", "password", "Password1",
                "fullName", "New Admin", "role", "ADMIN"));
        mockMvc.perform(post("/auth/register/admin").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }

    // ---------------------------------------------------------------- 2. project media IDOR

    @Test
    @DisplayName("A student cannot read, download, replace or delete another student's project media")
    void projectMediaIsScopedToOwner() throws Exception {
        StudentProject projectB = projectRepository.save(StudentProject.builder()
                .studentProfile(studentB).title("B's project")
                .mediaUrl("/api/files/download/projects/b_media.png").build());

        mockMvc.perform(get("/projects/" + projectB.getId() + "/media").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/projects/" + projectB.getId() + "/media/download").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isNotFound());
        // Student writes to verified sections are now refused outright (409) before any lookup.
        mockMvc.perform(delete("/projects/" + projectB.getId() + "/media").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isConflict());
        assertEquals("/api/files/download/projects/b_media.png",
                projectRepository.findById(projectB.getId()).orElseThrow().getMediaUrl());

        // The owner still sees their own media metadata.
        mockMvc.perform(get("/projects/" + projectB.getId() + "/media").header("Authorization", bearer(studentBToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fileName", is("b_media.png")));
    }

    @Test
    @DisplayName("Standalone media upload requires authentication")
    void standaloneUploadRequiresAuth() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/projects/media/upload")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "x.png", "image/png", new byte[]{1})))
                .andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- 5. eligibility on apply

    @Test
    @DisplayName("An ineligible student is refused with 400 naming the failed criterion")
    void ineligibleStudentCannotApply() throws Exception {
        Job job = saveJob(new BigDecimal("8.00"), JobStatus.ACTIVE);

        mockMvc.perform(post("/student/applications").header("Authorization", bearer(studentAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("jobId", job.getId(), "consentGiven", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("CGPA")));

        assertTrue(applicationRepository.findByStudentProfileId(studentA.getId()).isEmpty());
    }

    @Test
    @DisplayName("An eligible student can apply to a CLOSING_SOON job; a client-supplied resumeUrl is ignored")
    void eligibleStudentCanApplyToClosingSoonJob() throws Exception {
        Job job = saveJob(new BigDecimal("8.00"), JobStatus.CLOSING_SOON);

        mockMvc.perform(post("/student/applications").header("Authorization", bearer(studentBToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("jobId", job.getId(), "consentGiven", true,
                                "resumeUrl", "/api/files/download/resumes/someone_elses.pdf"))))
                .andExpect(status().isCreated());

        JobApplication application = applicationRepository.findByStudentProfileId(studentB.getId()).get(0);
        assertNull(application.getResumeUrl(), "resumeUrl must come from the student's own profile");
    }

    // ---------------------------------------------------------------- 13. status transitions

    @Test
    @DisplayName("Final statuses are enforced and un-selecting reverts the placement")
    void statusTransitionsAreEnforced() throws Exception {
        Job job = saveJob(null, JobStatus.ACTIVE);
        JobApplication application = applicationRepository.save(JobApplication.builder()
                .job(job).studentProfile(studentB).status(ApplicationStatus.APPLIED).consentGiven(true).build());
        String url = "/admin/applications/" + application.getId() + "/status";

        updateStatus(url, "SELECTED").andExpect(status().isOk());
        StudentProfile placed = studentProfileRepository.findById(studentB.getId()).orElseThrow();
        assertEquals(PlacementStatus.PLACED, placed.getPlacementStatus());

        // SELECTED is final except for SELECTED -> REJECTED.
        updateStatus(url, "UNDER_REVIEW").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("SELECTED")));
        updateStatus(url, "REJECTED").andExpect(status().isOk());
        StudentProfile reverted = studentProfileRepository.findById(studentB.getId()).orElseThrow();
        assertNotEquals(PlacementStatus.PLACED, reverted.getPlacementStatus());
        assertNull(reverted.getPlacedCompany());
        assertNull(reverted.getPlacedCtc());

        // REJECTED may only be reopened to UNDER_REVIEW / SHORTLISTED.
        updateStatus(url, "SELECTED").andExpect(status().isBadRequest());
        updateStatus(url, "SHORTLISTED").andExpect(status().isOk());

        // The student cannot withdraw once decided, and nothing leaves WITHDRAWN.
        updateStatus(url, "REJECTED").andExpect(status().isOk());
        mockMvc.perform(patch("/student/applications/" + application.getId() + "/withdraw")
                        .header("Authorization", bearer(studentBToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Nothing can move an application out of WITHDRAWN")
    void withdrawnIsTerminal() throws Exception {
        Job job = saveJob(null, JobStatus.ACTIVE);
        JobApplication application = applicationRepository.save(JobApplication.builder()
                .job(job).studentProfile(studentB).status(ApplicationStatus.WITHDRAWN).consentGiven(true).build());

        updateStatus("/admin/applications/" + application.getId() + "/status", "SHORTLISTED")
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------- 19. resume + file ownership

    @Test
    @DisplayName("Resume endpoints: 403 for another student, 404 for a missing profile, 400 for a bad id")
    void resumeAccessCodes() throws Exception {
        mockMvc.perform(get("/students/" + studentB.getId() + "/resume").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isForbidden())
                .andExpect(content().string(containsString("\"data\":null")));
        mockMvc.perform(get("/students/" + studentB.getId() + "/resume/download").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/students/999999999/resume").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/students/undefined/resume").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isBadRequest());
        // An admin passes the ownership check; there is simply no resume yet.
        mockMvc.perform(get("/students/" + studentB.getId() + "/resume").header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Stored files: students only reach files their own records reference")
    void fileDownloadOwnership() throws Exception {
        studentB.setResumeUrl("/api/files/download/resumes/b_resume.pdf");
        studentProfileRepository.save(studentB);

        mockMvc.perform(get("/files/download/resumes/b_resume.pdf").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/files/view/resumes/b_resume.pdf").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isForbidden());
        // Owner and admin pass the check (the file itself does not exist on disk here -> 404, not 403).
        mockMvc.perform(get("/files/view/resumes/b_resume.pdf").header("Authorization", bearer(studentBToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/files/view/resumes/b_resume.pdf").header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- 20. token handling

    @Test
    @DisplayName("Tokens are accepted only from the Authorization: Bearer header")
    void bearerOnly() throws Exception {
        mockMvc.perform(get("/auth/me").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/auth/me").param("token", studentAToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").param("authToken", studentAToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").header("X-Auth-Token", studentAToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").cookie(new Cookie("placement_jwt", studentAToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Changing the password revokes older tokens and returns a fresh one")
    void passwordChangeRevokesOldTokens() throws Exception {
        MvcResult result = mockMvc.perform(post("/student/account/change-password")
                        .header("Authorization", bearer(studentAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", PASSWORD, "newPassword", "NewPassword9"))))
                .andExpect(status().isOk())
                .andReturn();
        String freshToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
        assertTrue(!freshToken.isBlank(), "change-password must return a fresh token");

        mockMvc.perform(get("/auth/me").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").header("Authorization", bearer(freshToken)))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- 18. error body shape

    @Test
    @DisplayName("401, 403 and 404 bodies all carry success, message and data")
    void errorBodiesHaveUniformShape() throws Exception {
        mockMvc.perform(get("/student/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(content().string(containsString("\"data\":null")));
        mockMvc.perform(get("/admin/applications").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isForbidden())
                .andExpect(content().string(containsString("\"data\":null")));
        mockMvc.perform(get("/student/no-such-endpoint").header("Authorization", bearer(studentAToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(content().string(containsString("\"data\":null")));
        mockMvc.perform(get("/notifications").param("page", "-5").param("size", "100000")
                        .header("Authorization", bearer(studentAToken)))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- 9, 11, 12 admin data fixes

    @Test
    @DisplayName("Creating an existing company returns it with 200; a new one is 201")
    void companyCreateIsIdempotent() throws Exception {
        mockMvc.perform(post("/admin/companies").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", company.getName().toUpperCase()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Company already exists")))
                .andExpect(jsonPath("$.data.id", is(company.getId().intValue())));
        mockMvc.perform(post("/admin/companies").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Brand New " + UUID.randomUUID()))))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Job eligibility lists are persisted (normalised) and replaced on update")
    void jobEligibilityListsPersist() throws Exception {
        Map<String, Object> create = new java.util.HashMap<>(Map.of(
                "companyId", company.getId(), "jobRole", "SDE", "jobType", "FULL_TIME",
                "applicationDeadline", LocalDate.now().plusDays(5).toString(),
                "ctcValue", 600000, "minCgpa", 6.5,
                "skills", java.util.List.of("Java", "SQL"),
                "eligibleDepartments", java.util.List.of("cse", " ece ", "CSE"),
                "eligibleDegrees", java.util.List.of("B.E.")));
        MvcResult created = mockMvc.perform(post("/admin/jobs").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.eligibleDepartments[0]", is("CSE")))
                .andExpect(jsonPath("$.data.eligibleDepartments[1]", is("ECE")))
                .andExpect(jsonPath("$.data.eligibleDepartments.length()", is(2)))
                .andExpect(jsonPath("$.data.eligibleDegrees[0]", is("B.E.")))
                .andReturn();
        long jobId = objectMapper.readTree(created.getResponse().getContentAsString()).path("data").path("id").asLong();

        // Keeping "CSE" and "Java" must not collide with the unique (job_id, value) constraints.
        create.put("eligibleDepartments", java.util.List.of("CSE", "MECH"));
        create.put("skills", java.util.List.of("Java", "Spring"));
        create.put("eligibleDegrees", java.util.List.of());
        mockMvc.perform(put("/admin/jobs/" + jobId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligibleDepartments.length()", is(2)))
                .andExpect(jsonPath("$.data.eligibleDepartments[1]", is("MECH")))
                .andExpect(jsonPath("$.data.eligibleDegrees.length()", is(0)));
    }

    @Test
    @DisplayName("Admin student update can keep an existing skill (no unique-constraint violation)")
    void adminStudentSkillUpdateKeepsSkill() throws Exception {
        String url = "/admin/students/" + studentB.getId();
        mockMvc.perform(put(url).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("skills", java.util.List.of("Java", "SQL")))))
                .andExpect(status().isOk());
        mockMvc.perform(put(url).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("skills", java.util.List.of("Java", "Docker", "java")))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin student list caps the page size and ignores unknown sort fields")
    void adminStudentListPaging() throws Exception {
        mockMvc.perform(get("/admin/students").param("size", "5000").param("sortBy", "user.passwordHash")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.size", is(100)));
    }

    // ---------------------------------------------------------------- helpers

    private org.springframework.test.web.servlet.ResultActions updateStatus(String url, String status) throws Exception {
        return mockMvc.perform(put(url).header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", status))));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private User saveUser(String email, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(role)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .mustChangePassword(false)
                .build());
    }

    private StudentProfile saveProfile(User user, String rollNo, BigDecimal cgpa) {
        return studentProfileRepository.save(StudentProfile.builder()
                .user(user)
                .fullName("Student " + rollNo)
                .email(user.getEmail())
                .rollNo(rollNo.toUpperCase())
                .department("Computer Science")
                .departmentCode("CSE")
                .cgpa(cgpa)
                .placementStatus(PlacementStatus.ACTIVE)
                .profileSetupCompleted(true)
                .build());
    }

    private Job saveJob(BigDecimal minCgpa, JobStatus status) {
        return jobRepository.save(Job.builder()
                .company(company)
                .jobRole("SDE")
                .jobType(EmploymentType.FULL_TIME)
                .ctcValue(new BigDecimal("1200000.00"))
                .minCgpa(minCgpa)
                .applicationDeadline(LocalDate.now().plusDays(10))
                .status(status)
                .isActive(true)
                .postedBy(admin)
                .build());
    }
}
