package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.ApplicationStatusUpdateRequest;
import com.gces.placementcell.dto.response.CompanyResponse;
import com.gces.placementcell.dto.response.JobApplicationResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.dto.response.StudentSummaryResponse;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.ApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Admin Application Controller Tests")
class AdminApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TokenProvider tokenProvider;

    @MockBean
    private ApplicationService applicationService;

    @MockBean
    private UserRepository userRepository;

    private String adminToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        User adminUser = User.builder()
                .id(1L)
                .email("admin@gces.edu")
                .role(UserRole.ADMIN)
                .isActive(true)
                .isDeleted(false)
                .build();

        User studentUser = User.builder()
                .id(2L)
                .email("student@gces.edu")
                .role(UserRole.STUDENT)
                .isActive(true)
                .isDeleted(false)
                .build();

        when(userRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmailAndIsDeletedFalse("admin@gces.edu")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByIdAndIsDeletedFalse(2L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));

        adminToken = "Bearer " + tokenProvider.generateToken(adminUser);
        studentToken = "Bearer " + tokenProvider.generateToken(studentUser);
    }

    private JobApplicationResponse sampleResponse(Long id, ApplicationStatus status, String stage) {
        CompanyResponse comp = new CompanyResponse(10L, "Google", "GOOG", null, null, null, null, "Tech");
        JobSummaryResponse job = new JobSummaryResponse(
                100L, comp, "Software Engineer", EmploymentType.FULL_TIME, "Bangalore",
                "24 LPA", new BigDecimal("2400000.00"), 5, new BigDecimal("8.00"),
                false, LocalDate.now().plusMonths(1), LocalDate.now(), JobStatus.ACTIVE, true, false
        );
        StudentSummaryResponse student = new StudentSummaryResponse(
                50L, "912822104001", "Adithya K", "adithya.k@gce.edu.in", null,
                "Computer Science", "CSE", "2022-2026", (short) 7,
                new BigDecimal("8.90"), 0, PlacementStatus.PENDING, true, (short) 90
        );
        return new JobApplicationResponse(
                id, job, student, LocalDateTime.now().minusDays(2), "Cover letter",
                null, true, status, stage, null, null, null, List.of(),
                LocalDateTime.now().minusDays(2), LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /admin/applications as admin returns 200 and list of applications")
    void testListApplicationsAsAdmin() throws Exception {
        JobApplicationResponse app = sampleResponse(1L, ApplicationStatus.APPLIED, "Application Submitted");
        when(applicationService.listApplications(isNull(), isNull(), eq(0), eq(20)))
                .thenReturn(new PageImpl<>(List.of(app)));

        mockMvc.perform(get("/admin/applications")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(1))
                .andExpect(jsonPath("$.data.content[0].student.fullName").value("Adithya K"))
                .andExpect(jsonPath("$.data.content[0].student.rollNo").value("912822104001"))
                .andExpect(jsonPath("$.data.content[0].job.company.name").value("Google"))
                .andExpect(jsonPath("$.data.content[0].job.jobRole").value("Software Engineer"))
                .andExpect(jsonPath("$.data.content[0].status").value("APPLIED"));
    }

    @Test
    @DisplayName("PUT /admin/applications/{id}/status as admin updates status to SHORTLISTED")
    void testUpdateStatusToShortlisted() throws Exception {
        JobApplicationResponse updated = sampleResponse(1L, ApplicationStatus.SHORTLISTED, "Shortlisted");
        when(applicationService.updateStatus(eq("admin@gces.edu"), eq(1L), any(ApplicationStatusUpdateRequest.class)))
                .thenReturn(updated);

        ApplicationStatusUpdateRequest req = new ApplicationStatusUpdateRequest(
                ApplicationStatus.SHORTLISTED, null, null, "Shortlisted for interview round"
        );

        mockMvc.perform(put("/admin/applications/1/status")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SHORTLISTED"))
                .andExpect(jsonPath("$.data.currentStage").value("Shortlisted"));
    }

    @Test
    @DisplayName("PUT /admin/applications/{id}/status supports INTERVIEW status")
    void testUpdateStatusToInterview() throws Exception {
        JobApplicationResponse updated = sampleResponse(1L, ApplicationStatus.INTERVIEW, "Interview");
        when(applicationService.updateStatus(eq("admin@gces.edu"), eq(1L), any(ApplicationStatusUpdateRequest.class)))
                .thenReturn(updated);

        ApplicationStatusUpdateRequest req = new ApplicationStatusUpdateRequest(
                ApplicationStatus.INTERVIEW, "Interview", null, "Invited to technical interview"
        );

        mockMvc.perform(put("/admin/applications/1/status")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INTERVIEW"));
    }

    @Test
    @DisplayName("PUT /admin/applications/{id}/status as student returns 403 Forbidden")
    void testUpdateStatusAsStudentReturnsForbidden() throws Exception {
        ApplicationStatusUpdateRequest req = new ApplicationStatusUpdateRequest(
                ApplicationStatus.SELECTED, null, null, null
        );

        mockMvc.perform(put("/admin/applications/1/status")
                        .header(HttpHeaders.AUTHORIZATION, studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /admin/applications/{id}/status without authentication returns 401 Unauthorized")
    void testUpdateStatusWithoutAuthReturnsUnauthorized() throws Exception {
        ApplicationStatusUpdateRequest req = new ApplicationStatusUpdateRequest(
                ApplicationStatus.SHORTLISTED, null, null, null
        );

        mockMvc.perform(put("/admin/applications/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /admin/applications/{id}/status with non-existent application returns 404")
    void testUpdateStatusNonExistent() throws Exception {
        when(applicationService.updateStatus(eq("admin@gces.edu"), eq(999L), any(ApplicationStatusUpdateRequest.class)))
                .thenThrow(new ResourceNotFoundException("Application", "id", 999L));

        ApplicationStatusUpdateRequest req = new ApplicationStatusUpdateRequest(
                ApplicationStatus.SHORTLISTED, null, null, null
        );

        mockMvc.perform(put("/admin/applications/999/status")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }
}
