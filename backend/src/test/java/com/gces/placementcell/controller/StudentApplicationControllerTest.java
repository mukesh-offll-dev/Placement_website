package com.gces.placementcell.controller;

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
import com.gces.placementcell.exception.BadRequestException;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Student Application Controller Tests")
class StudentApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TokenProvider tokenProvider;

    @MockBean
    private ApplicationService applicationService;

    @MockBean
    private UserRepository userRepository;

    private String studentToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        User studentUser = User.builder()
                .id(2L)
                .email("student@gces.edu")
                .role(UserRole.STUDENT)
                .isActive(true)
                .isDeleted(false)
                .build();

        User adminUser = User.builder()
                .id(1L)
                .email("admin@gces.edu")
                .role(UserRole.ADMIN)
                .isActive(true)
                .isDeleted(false)
                .build();

        when(userRepository.findByIdAndIsDeletedFalse(2L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(userRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(adminUser));
        when(userRepository.findByEmailAndIsDeletedFalse("admin@gces.edu")).thenReturn(Optional.of(adminUser));

        studentToken = "Bearer " + tokenProvider.generateToken(studentUser);
        adminToken = "Bearer " + tokenProvider.generateToken(adminUser);
    }

    private JobApplicationResponse sampleWithdrawnResponse(Long id) {
        CompanyResponse comp = new CompanyResponse(10L, "Acme Corp", "ACME", null, null, null, null, "Tech");
        JobSummaryResponse job = new JobSummaryResponse(
                100L, comp, "Software Engineer", EmploymentType.FULL_TIME, "Bangalore",
                "12 LPA", new BigDecimal("1200000.00"), 5, new BigDecimal("8.00"),
                false, LocalDate.now().plusMonths(1), LocalDate.now(), JobStatus.ACTIVE, true, false
        );
        StudentSummaryResponse student = new StudentSummaryResponse(
                50L, "811521104001", "Student Name", "student@gces.edu", null,
                "Computer Science", "CSE", "2021-2025", (short) 7,
                new BigDecimal("8.50"), 0, PlacementStatus.PENDING, true, (short) 80
        );
        return new JobApplicationResponse(
                id, job, student, LocalDateTime.now().minusDays(2), "Cover letter",
                null, true, ApplicationStatus.WITHDRAWN, "Application Withdrawn", null, null, null, List.of(),
                LocalDateTime.now().minusDays(2), LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("PATCH /student/applications/{id}/withdraw with valid student returns 200 and success response")
    void testWithdrawApplicationSuccess() throws Exception {
        JobApplicationResponse response = sampleWithdrawnResponse(10L);
        when(applicationService.withdraw("student@gces.edu", 10L)).thenReturn(response);

        mockMvc.perform(patch("/student/applications/10/withdraw")
                        .header(HttpHeaders.AUTHORIZATION, studentToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Application withdrawn successfully"))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.status").value("WITHDRAWN"))
                .andExpect(jsonPath("$.data.currentStage").value("Application Withdrawn"));

        verify(applicationService).withdraw("student@gces.edu", 10L);
    }

    @Test
    @DisplayName("PATCH /student/applications/{id}/withdraw without authentication returns 401 Unauthorized")
    void testWithdrawUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(patch("/student/applications/10/withdraw")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PATCH /student/applications/{id}/withdraw with ROLE_ADMIN returns 403 Forbidden")
    void testWithdrawWithAdminRoleReturns403() throws Exception {
        mockMvc.perform(patch("/student/applications/10/withdraw")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PATCH /student/applications/{id}/withdraw for another student's application returns 404 Not Found")
    void testWithdrawOtherStudentApplicationReturns404() throws Exception {
        when(applicationService.withdraw("student@gces.edu", 99L))
                .thenThrow(new ResourceNotFoundException("Application", "id", 99L));

        mockMvc.perform(patch("/student/applications/99/withdraw")
                        .header(HttpHeaders.AUTHORIZATION, studentToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PATCH /student/applications/{id}/withdraw when application already withdrawn returns 400 Bad Request")
    void testWithdrawAlreadyWithdrawnReturns400() throws Exception {
        when(applicationService.withdraw("student@gces.edu", 10L))
                .thenThrow(new BadRequestException("This application can no longer be withdrawn"));

        mockMvc.perform(patch("/student/applications/10/withdraw")
                        .header(HttpHeaders.AUTHORIZATION, studentToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("This application can no longer be withdrawn"));
    }
}
