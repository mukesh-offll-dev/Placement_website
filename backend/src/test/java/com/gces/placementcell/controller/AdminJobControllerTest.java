package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Admin Job Controller Integration Tests")
class AdminJobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private User adminUser;
    private Company testCompany;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmailAndIsDeletedFalse("admin@gces.edu")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("admin@gces.edu")
                        .passwordHash("hashed")
                        .role(UserRole.ADMIN)
                        .isActive(true)
                        .isDeleted(false)
                        .build()));

        testCompany = companyRepository.findByNameIgnoreCase("TestCorp")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .name("TestCorp")
                        .shortName("TC")
                        .build()));
    }

    private JobRequest buildValidRequest(LocalDate deadline, BigDecimal minCgpa, BigDecimal maxCgpa, BigDecimal ctcValue) {
        return new JobRequest(
                null,
                "TestCorp",
                "https://testcorp.example.com",
                "careers@testcorp.example.com",
                null,
                false,
                "Backend Engineer",
                "Build scalable APIs",
                EmploymentType.FULL_TIME,
                "Chennai",
                ctcValue != null ? ctcValue.stripTrailingZeros().toPlainString() + " LPA" : null,
                ctcValue,
                5,
                "None",
                minCgpa,
                maxCgpa,
                false,
                (short) 2026,
                deadline,
                "https://testcorp.example.com/apply",
                "Apply with updated resume",
                JobStatus.ACTIVE,
                List.of("Java", "Spring Boot"),
                List.of("No active backlogs"),
                List.of("Design REST APIs", "Write unit tests"),
                List.of("Health Insurance", "Flexible Hours"),
                List.of("Online Coding Test", "Technical Interview", "HR Round")
        );
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should reject missing required fields and invalid email/URL with 400 validation errors")
    void shouldRejectMissingRequiredFields() throws Exception {
        JobRequest invalid = new JobRequest(
                null, "", "not-a-url", "invalid-email", null, null, "", null, null, null, "",
                null, null, null, null, null, null, null, null, "ftp://bad", null, null,
                null, null, null, null, null
        );

        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.jobRole").exists())
                .andExpect(jsonPath("$.data.ctcValue").exists())
                .andExpect(jsonPath("$.data.minCgpa").exists())
                .andExpect(jsonPath("$.data.applicationDeadline").exists())
                .andExpect(jsonPath("$.data.companyWebsite").exists())
                .andExpect(jsonPath("$.data.contactEmail").exists())
                .andExpect(jsonPath("$.data.applicationUrl").exists());
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should reject past deadline and non-positive CTC")
    void shouldRejectPastDeadlineAndInvalidCtc() throws Exception {
        JobRequest pastDeadline = buildValidRequest(
                LocalDate.now().minusDays(1), new BigDecimal("7.50"), new BigDecimal("9.50"), new BigDecimal("0.00"));

        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pastDeadline)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.applicationDeadline").exists())
                .andExpect(jsonPath("$.data.ctcValue").exists());
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should enforce CGPA bounds (0-10) and minCgpa <= maxCgpa")
    void shouldValidateCgpaBoundsAndRange() throws Exception {
        // 0.00 and 10.00 allowed
        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                buildValidRequest(LocalDate.now().plusDays(10), new BigDecimal("0.00"), new BigDecimal("10.00"), new BigDecimal("12.00")))))
                .andExpect(status().isCreated());

        // minCgpa > maxCgpa rejected
        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                buildValidRequest(LocalDate.now().plusDays(10), new BigDecimal("8.50"), new BigDecimal("7.00"), new BigDecimal("12.00")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.cgpaRangeValid").exists());

        // -0.10 rejected
        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                buildValidRequest(LocalDate.now().plusDays(10), new BigDecimal("-0.10"), null, new BigDecimal("12.00")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.minCgpa").exists());

        // 10.10 maxCgpa rejected
        mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                buildValidRequest(LocalDate.now().plusDays(10), new BigDecimal("7.00"), new BigDecimal("10.10"), new BigDecimal("12.00")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.maxCgpa").exists());
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should persist and update dynamic extra fields (responsibilities, skills, perks, selectionRounds)")
    void shouldPersistAndEditDynamicFields() throws Exception {
        JobRequest request = buildValidRequest(
                LocalDate.now().plusDays(15), new BigDecimal("7.50"), new BigDecimal("9.50"), new BigDecimal("12.50"));

        String responseJson = mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.skills", hasSize(2)))
                .andExpect(jsonPath("$.data.responsibilities", hasSize(2)))
                .andExpect(jsonPath("$.data.perks", hasSize(2)))
                .andExpect(jsonPath("$.data.selectionRounds", hasSize(3)))
                .andExpect(jsonPath("$.data.maxCgpa").value(9.50))
                .andReturn().getResponse().getContentAsString();

        Long jobId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        JobRequest updated = new JobRequest(
                null,
                "TestCorp",
                "https://testcorp.example.com",
                "careers@testcorp.example.com",
                null,
                false,
                "Senior Backend Engineer",
                "Updated description",
                EmploymentType.FULL_TIME,
                "Bangalore",
                "16 LPA",
                new BigDecimal("16.00"),
                3,
                "None",
                new BigDecimal("8.00"),
                new BigDecimal("10.00"),
                false,
                (short) 2026,
                LocalDate.now().plusDays(20),
                "https://testcorp.example.com/jobs",
                "Submit portfolio link",
                JobStatus.ACTIVE,
                List.of("Java", "Docker", "Kubernetes"),
                List.of("No active backlogs"),
                List.of("Architect microservices"),
                List.of("Stock Options"),
                List.of("Coding Test", "System Design")
        );

        mockMvc.perform(put("/admin/jobs/" + jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.jobRole").value("Senior Backend Engineer"))
                .andExpect(jsonPath("$.data.skills", containsInAnyOrder("Java", "Docker", "Kubernetes")))
                .andExpect(jsonPath("$.data.responsibilities", hasSize(1)))
                .andExpect(jsonPath("$.data.perks", hasSize(1)))
                .andExpect(jsonPath("$.data.selectionRounds", hasSize(2)));
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should validate and upload valid PNG logo, and reject invalid type or oversized file")
    void shouldValidateCompanyLogoUpload() throws Exception {
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D};
        MockMultipartFile validPng = new MockMultipartFile(
                "file", "logo.png", "image/png", pngHeader);

        mockMvc.perform(multipart("/admin/jobs/logo").file(validPng))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.logoUrl").exists());

        MockMultipartFile invalidType = new MockMultipartFile(
                "file", "script.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/admin/jobs/logo").file(invalidType))
                .andExpect(status().isBadRequest());

        byte[] oversized = new byte[2 * 1024 * 1024 + 100];
        oversized[0] = (byte) 0x89;
        oversized[1] = 0x50;
        oversized[2] = 0x4E;
        oversized[3] = 0x47;
        MockMultipartFile tooBig = new MockMultipartFile(
                "file", "big.png", "image/png", oversized);

        mockMvc.perform(multipart("/admin/jobs/logo").file(tooBig))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("Should manually close, reopen active job, and auto-close & block reopening expired job")
    void shouldManageJobStatusAndAutoCloseExpired() throws Exception {
        String createdJson = mockMvc.perform(post("/admin/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                buildValidRequest(LocalDate.now().plusDays(5), new BigDecimal("7.00"), new BigDecimal("10.00"), new BigDecimal("10.00")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.daysRemaining").value(5))
                .andReturn().getResponse().getContentAsString();

        Long activeJobId = objectMapper.readTree(createdJson).path("data").path("id").asLong();

        mockMvc.perform(patch("/admin/jobs/" + activeJobId + "/close"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.isActive").value(false));

        mockMvc.perform(patch("/admin/jobs/" + activeJobId + "/reopen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.isActive").value(true));

        Job expiredJob = Job.builder()
                .company(testCompany)
                .jobRole("Legacy Role")
                .jobType(EmploymentType.FULL_TIME)
                .ctcText("10 LPA")
                .ctcValue(new BigDecimal("10.00"))
                .minCgpa(new BigDecimal("6.50"))
                .postedBy(adminUser)
                .postedDate(LocalDate.now().minusDays(10))
                .applicationDeadline(LocalDate.now().minusDays(2))
                .status(JobStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .build();
        expiredJob = jobRepository.saveAndFlush(expiredJob);

        mockMvc.perform(get("/admin/jobs"))
                .andExpect(status().isOk());

        entityManager.clear();
        Job reloaded = jobRepository.findById(expiredJob.getId()).orElseThrow();
        assertEquals(JobStatus.CLOSED, reloaded.getStatus());
        assertFalse(reloaded.getIsActive());

        mockMvc.perform(patch("/admin/jobs/" + expiredJob.getId() + "/reopen"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/admin/jobs/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalJobs").isNumber())
                .andExpect(jsonPath("$.data.activeJobs").isNumber())
                .andExpect(jsonPath("$.data.closedJobs").isNumber())
                .andExpect(jsonPath("$.data.upcomingDeadlines").isNumber());
    }
}
