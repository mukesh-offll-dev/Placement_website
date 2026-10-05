package com.gces.placementcell.security;

import com.gces.placementcell.config.CorsConfig;
import com.gces.placementcell.config.SecurityConfig;
import com.gces.placementcell.controller.StudentProfileController;
import com.gces.placementcell.controller.StudentProjectController;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.service.StudentProfileService;
import com.gces.placementcell.service.StudentProjectService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {StudentProfileController.class, StudentProjectController.class})
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class, CustomAuthenticationEntryPoint.class})
@DisplayName("Spring Security Role Authorization Tests for Student APIs")
class StudentSecurityAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudentProfileService studentProfileService;

    @MockBean
    private StudentProjectService studentProjectService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private JwtService jwtService;

    // SecurityConfig wires AdminAuthFilter, the live bearer-token filter.
    @MockBean
    private TokenProvider tokenProvider;

    @MockBean
    private com.gces.placementcell.repository.UserRepository userRepository;

    // =========================================================================
    // Student Profile Security Tests
    // =========================================================================

    @Test
    @DisplayName("GET /student/profile without authentication returns 401 Unauthorized")
    void testGetProfileUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/student/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.startsWith("Unauthorized:")));
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("GET /student/profile with ROLE_ADMIN returns 403 Forbidden")
    void testGetProfileWithAdminRoleReturns403() throws Exception {
        mockMvc.perform(get("/student/profile"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Forbidden: You do not have permission to access this resource"));
    }

    @Test
    @WithMockUser(username = "student@gces.edu", roles = {"STUDENT"})
    @DisplayName("GET /student/profile with ROLE_STUDENT returns 200 OK")
    void testGetProfileWithStudentRoleReturns200() throws Exception {
        StudentProfileResponse profile = new StudentProfileResponse(
                1L,
                new UserResponse(1L, "student@gces.edu", UserRole.STUDENT, AccountStatus.ACTIVE, true, true, null, LocalDateTime.now()),
                "811521104001",
                "Adithya Kumar",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "bio",
                null, null, "GCES", "B.E.", "CSE", "CSE", "2021-2025",
                (short) 7, new BigDecimal("8.50"), 0, 0,
                PlacementStatus.PENDING, true, null, null, null,
                (short) 80, List.of(), List.of(), List.of(), List.of(),
                LocalDateTime.now(), LocalDateTime.now()
        );

        when(studentProfileService.getProfile(anyString())).thenReturn(profile);

        mockMvc.perform(get("/student/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Adithya Kumar"));
    }

    // =========================================================================
    // Student Projects Security Tests
    // =========================================================================

    @Test
    @DisplayName("GET /student/projects without authentication returns 401 Unauthorized")
    void testGetProjectsUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/student/projects"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "admin@gces.edu", roles = {"ADMIN"})
    @DisplayName("GET /student/projects with ROLE_ADMIN returns 403 Forbidden")
    void testGetProjectsWithAdminRoleReturns403() throws Exception {
        mockMvc.perform(get("/student/projects"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "student@gces.edu", roles = {"STUDENT"})
    @DisplayName("GET /student/projects with ROLE_STUDENT returns 200 OK")
    void testGetProjectsWithStudentRoleReturns200() throws Exception {
        when(studentProjectService.getAllProjects(anyString())).thenReturn(List.of());

        mockMvc.perform(get("/student/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
