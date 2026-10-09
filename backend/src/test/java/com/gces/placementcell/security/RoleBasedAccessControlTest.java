package com.gces.placementcell.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.LoginRequestDTO;
import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Role-Based Access Control (RBAC) End-to-End Tests")
class RoleBasedAccessControlTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private AdminProfileRepository adminProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String STUDENT_EMAIL = "student.test@gces.edu.np";
    private static final String ADMIN_EMAIL = "admin.test@gces.edu.np";
    private static final String INACTIVE_EMAIL = "inactive.test@gces.edu.np";
    private static final String RAW_PASSWORD = "Password@123";

    private String studentToken;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        studentProfileRepository.deleteAll();
        adminProfileRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Seed Active Student
        User studentUser = User.builder()
                .email(STUDENT_EMAIL)
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        studentUser = userRepository.save(studentUser);

        StudentProfile studentProfile = StudentProfile.builder()
                .user(studentUser)
                .fullName("John Doe Student")
                .email(STUDENT_EMAIL)
                .rollNo("GCES-2022-CS-01")
                .department("Computer Engineering")
                .departmentCode("CS")
                .batch("2022")
                .cgpa(new BigDecimal("3.85"))
                .placementStatus(PlacementStatus.PENDING)
                .isOpenToOpportunities(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        studentProfileRepository.save(studentProfile);

        // 2. Seed Active Admin
        User adminUser = User.builder()
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .role(UserRole.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        adminUser = userRepository.save(adminUser);

        AdminProfile adminProfile = AdminProfile.builder()
                .user(adminUser)
                .name("Placement Officer Smith")
                .designation("Head Placement Officer")
                .department("Training & Placement")
                .contactEmail(ADMIN_EMAIL)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        adminProfileRepository.save(adminProfile);

        // 3. Seed Inactive User
        User inactiveUser = User.builder()
                .email(INACTIVE_EMAIL)
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.PENDING)
                .isActive(false)
                .isEmailVerified(false)
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        userRepository.save(inactiveUser);

        // Obtain Student Token via Auth API
        LoginRequestDTO studentReq = new LoginRequestDTO();
        studentReq.setEmail(STUDENT_EMAIL);
        studentReq.setPassword(RAW_PASSWORD);
        studentReq.setExpectedRole("STUDENT");

        MvcResult studentLoginRes = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(studentReq)))
                .andExpect(status().isOk())
                .andReturn();
        studentToken = objectMapper.readTree(studentLoginRes.getResponse().getContentAsString())
                .path("data").path("token").asText();

        // Obtain Admin Token via Auth API
        LoginRequestDTO adminReq = new LoginRequestDTO();
        adminReq.setEmail(ADMIN_EMAIL);
        adminReq.setPassword(RAW_PASSWORD);
        adminReq.setExpectedRole("ADMIN");

        MvcResult adminLoginRes = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminReq)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminLoginRes.getResponse().getContentAsString())
                .path("data").path("token").asText();

        assertNotNull(studentToken);
        assertNotNull(adminToken);
    }

    // --- 1. Public Endpoint Tests ---

    @Test
    @DisplayName("Public health endpoint is accessible without authentication")
    void publicHealthEndpointAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }

    // --- 2. Unauthenticated Access Protection Tests ---

    @Test
    @DisplayName("Unauthenticated request to /admin/dashboard returns 401 Unauthorized")
    void unauthenticatedAdminAccessRejected() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Unauthenticated request to /student/dashboard returns 401 Unauthorized")
    void unauthenticatedStudentAccessRejected() throws Exception {
        mockMvc.perform(get("/student/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    // --- 3. Student Role Authorized Features Tests ---

    @Test
    @DisplayName("Student can successfully access student dashboard")
    void studentCanAccessStudentDashboard() throws Exception {
        mockMvc.perform(get("/student/dashboard")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.studentEmail", is(STUDENT_EMAIL)))
                .andExpect(jsonPath("$.data.portal", is("Student Career Portal")));
    }

    @Test
    @DisplayName("Student can successfully access student profile")
    void studentCanAccessStudentProfile() throws Exception {
        mockMvc.perform(get("/student/profile")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is(STUDENT_EMAIL)))
                .andExpect(jsonPath("$.data.role", is("STUDENT")))
                .andExpect(jsonPath("$.data.fullName", is("John Doe Student")));
    }

    // --- 4. Student Role Boundary / Forbidden Tests ---

    @Test
    @DisplayName("Student is FORBIDDEN (403) from accessing admin dashboard")
    void studentForbiddenFromAdminDashboard() throws Exception {
        mockMvc.perform(get("/admin/dashboard")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student is FORBIDDEN (403) from accessing admin profile")
    void studentForbiddenFromAdminProfile() throws Exception {
        mockMvc.perform(get("/admin/profile")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    // --- 5. Admin Role Authorized Features Tests ---

    @Test
    @DisplayName("Admin can successfully access admin dashboard")
    void adminCanAccessAdminDashboard() throws Exception {
        mockMvc.perform(get("/admin/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.adminEmail", is(ADMIN_EMAIL)))
                .andExpect(jsonPath("$.data.portal", is("Admin Management Console")));
    }

    @Test
    @DisplayName("Admin can successfully access admin profile")
    void adminCanAccessAdminProfile() throws Exception {
        mockMvc.perform(get("/admin/profile")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is(ADMIN_EMAIL)))
                .andExpect(jsonPath("$.data.role", is("ADMIN")))
                .andExpect(jsonPath("$.data.name", is("Placement Officer Smith")));
    }

    // --- 6. Admin Role Boundary / Forbidden Tests ---

    @Test
    @DisplayName("Admin is FORBIDDEN (403) from accessing student dashboard")
    void adminForbiddenFromStudentDashboard() throws Exception {
        mockMvc.perform(get("/student/dashboard")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin is FORBIDDEN (403) from accessing student profile")
    void adminForbiddenFromStudentProfile() throws Exception {
        mockMvc.perform(get("/student/profile")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    // --- 7. Authentication Flow & Guard Tests ---

    @Test
    @DisplayName("Login with invalid password returns 401 Unauthorized")
    void loginWithBadPasswordFails() throws Exception {
        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail(STUDENT_EMAIL);
        req.setPassword("WrongPassword!");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Login with mismatched expected role returns 403 Forbidden")
    void loginWithMismatchedRoleFails() throws Exception {
        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail(STUDENT_EMAIL);
        req.setPassword(RAW_PASSWORD);
        req.setExpectedRole("ADMIN"); // Student attempting to login through Admin portal

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Inactive or unapproved user login is rejected")
    void inactiveUserLoginRejected() throws Exception {
        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail(INACTIVE_EMAIL);
        req.setPassword(RAW_PASSWORD);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Login with unknown email returns 401 Unauthorized and error message")
    void loginWithUnknownEmailReturns401() throws Exception {
        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail("completely.unknown@gces.edu.np");
        req.setPassword("AnyPassword@123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Invalid email or password")))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("Login with incorrect password returns 401 Unauthorized and error message")
    void loginWithIncorrectPasswordReturns401() throws Exception {
        LoginRequestDTO req = new LoginRequestDTO();
        req.setEmail(STUDENT_EMAIL);
        req.setPassword("WrongPassword@999");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Invalid email or password")))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    // --- 8. HTTP Basic Fallback Verification ---

    @Test
    @DisplayName("HTTP Basic authentication with Admin credentials can access admin dashboard")
    void httpBasicAdminAccessSuccess() throws Exception {
        mockMvc.perform(get("/admin/dashboard")
                        .with(httpBasic(ADMIN_EMAIL, RAW_PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("HTTP Basic authentication with Student credentials to admin dashboard is forbidden (403)")
    void httpBasicStudentAccessToAdminForbidden() throws Exception {
        mockMvc.perform(get("/admin/dashboard")
                        .with(httpBasic(STUDENT_EMAIL, RAW_PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
