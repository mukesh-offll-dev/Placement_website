package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.DashboardStatsDto;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AdminDashboardService;
import com.gces.placementcell.service.AdminStudentService;
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
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Admin Student & Dashboard Controller Tests")
class AdminStudentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TokenProvider tokenProvider;

    @MockBean
    private AdminStudentService adminStudentService;

    @MockBean
    private AdminDashboardService adminDashboardService;

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

    @Test
    @DisplayName("GET /api/admin/students without auth should return 401 Unauthorized")
    void testGetStudentsWithoutAuthReturns401() throws Exception {
        mockMvc.perform(get("/admin/students"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/admin/students with STUDENT role should return 403 Forbidden")
    void testGetStudentsWithStudentRoleReturns403() throws Exception {
        mockMvc.perform(get("/admin/students")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/admin/students with ADMIN role should return 200 OK")
    void testGetStudentsWithAdminRoleReturns200() throws Exception {
        StudentSummaryDto student = StudentSummaryDto.builder()
                .id(1L)
                .rollNo("912822104001")
                .fullName("Adithya K")
                .email("adithya.k@gce.edu.in")
                .department("Computer Science (CSE)")
                .cgpa(new BigDecimal("8.92"))
                .placementStatus(PlacementStatus.PLACED)
                .build();

        PageResponse<StudentSummaryDto> page = PageResponse.<StudentSummaryDto>builder()
                .content(List.of(student))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .first(true)
                .last(true)
                .build();

        when(adminStudentService.getStudents(any(), any(), any(), any(), anyInt(), anyInt(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/admin/students")
                        .header("Authorization", adminToken)
                        .param("search", "Adithya")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].fullName").value("Adithya K"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/admin/students/{id} should return student details")
    void testGetStudentByIdReturnsDetails() throws Exception {
        StudentDetailDto detail = StudentDetailDto.builder()
                .id(1L)
                .rollNo("912822104001")
                .fullName("Adithya K")
                .email("adithya.k@gce.edu.in")
                .department("Computer Science (CSE)")
                .cgpa(new BigDecimal("8.92"))
                .placementStatus(PlacementStatus.PLACED)
                .skills(List.of())
                .build();

        when(adminStudentService.getStudentById(1L)).thenReturn(detail);

        mockMvc.perform(get("/admin/students/1")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Adithya K"));
    }

    @Test
    @DisplayName("GET /api/admin/students/{id} not found returns 404")
    void testGetStudentByIdNotFound() throws Exception {
        when(adminStudentService.getStudentById(999L))
                .thenThrow(new ResourceNotFoundException("Student not found with ID: 999"));

        mockMvc.perform(get("/admin/students/999")
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/admin/students should create new student and return 201 Created")
    void testCreateStudentSuccess() throws Exception {
        CreateStudentRequest req = CreateStudentRequest.builder()
                .rollNo("912822104099")
                .fullName("New Student")
                .email("new.student@gce.edu.in")
                .department("Computer Science (CSE)")
                .cgpa(new BigDecimal("8.50"))
                .build();

        StudentDetailDto created = StudentDetailDto.builder()
                .id(10L)
                .rollNo(req.getRollNo())
                .fullName(req.getFullName())
                .email(req.getEmail())
                .department(req.getDepartment())
                .cgpa(req.getCgpa())
                .build();

        when(adminStudentService.createStudent(any(CreateStudentRequest.class))).thenReturn(created);

        mockMvc.perform(post("/admin/students")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("New Student"));
    }

    @Test
    @DisplayName("POST /api/admin/students with duplicate rollNo returns 400 Bad Request")
    void testCreateStudentDuplicateRollNo() throws Exception {
        CreateStudentRequest req = CreateStudentRequest.builder()
                .rollNo("912822104001")
                .fullName("Duplicate Student")
                .email("duplicate@gce.edu.in")
                .department("Computer Science (CSE)")
                .build();

        when(adminStudentService.createStudent(any(CreateStudentRequest.class)))
                .thenThrow(new BadRequestException("Student with register/roll number '912822104001' already exists"));

        mockMvc.perform(post("/admin/students")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Student with register/roll number '912822104001' already exists"));
    }

    @Test
    @DisplayName("PUT /api/admin/students/{id} should update student details")
    void testUpdateStudentSuccess() throws Exception {
        UpdateStudentRequest req = UpdateStudentRequest.builder()
                .fullName("Updated Name")
                .cgpa(new BigDecimal("9.20"))
                .build();

        StudentDetailDto updated = StudentDetailDto.builder()
                .id(1L)
                .fullName("Updated Name")
                .cgpa(new BigDecimal("9.20"))
                .build();

        when(adminStudentService.updateStudent(eq(1L), any(UpdateStudentRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/admin/students/1")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Updated Name"));
    }

    @Test
    @DisplayName("DELETE /api/admin/students/{id} should soft-delete student")
    void testDeleteStudentSuccess() throws Exception {
        doNothing().when(adminStudentService).deleteStudent(1L);

        mockMvc.perform(delete("/admin/students/1")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Student deactivated successfully"));

        verify(adminStudentService, times(1)).deleteStudent(1L);
    }

    @Test
    @DisplayName("GET /api/admin/students/export returns CSV file with headers")
    void testExportStudentsCsv() throws Exception {
        String csvContent = "ID,Register / Roll No,Full Name\n1,912822104001,Adithya K\n";
        byte[] csvBytes = csvContent.getBytes(StandardCharsets.UTF_8);

        when(adminStudentService.exportStudentsCsv(any(), any(), any())).thenReturn(csvBytes);

        mockMvc.perform(get("/admin/students/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students_report.csv\""))
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(content().string(csvContent));
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/stats returns real portal statistics")
    void testGetDashboardStats() throws Exception {
        DashboardStatsDto stats = DashboardStatsDto.builder()
                .totalStudents(8)
                .totalPlaced(2)
                .totalUnplaced(6)
                .placementPercentage(25.0)
                .totalCompanies(5)
                .totalApplications(12)
                .selectedStudents(2)
                .totalActiveJobs(5)
                .departmentStudentCount(Map.of("Computer Science (CSE)", 2L))
                .departmentStats(List.of())
                .recentJobs(List.of())
                .recentApplications(List.of())
                .build();

        when(adminDashboardService.getDashboardStats()).thenReturn(stats);

        mockMvc.perform(get("/admin/dashboard/stats")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalStudents").value(8))
                .andExpect(jsonPath("$.data.totalPlaced").value(2))
                .andExpect(jsonPath("$.data.placementPercentage").value(25.0))
                .andExpect(jsonPath("$.data.totalCompanies").value(5));
    }
}
