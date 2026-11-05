package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.dto.response.StudentExperienceResponse;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.exception.GlobalExceptionHandler;
import com.gces.placementcell.service.StudentProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Student Education and Experience Controller Tests")
class StudentEducationAndExperienceControllerTest {

    private MockMvc educationMockMvc;
    private MockMvc experienceMockMvc;
    private MockMvc profileMockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private StudentProfileService studentProfileService;

    @InjectMocks
    private StudentEducationController studentEducationController;

    @InjectMocks
    private StudentExperienceController studentExperienceController;

    @InjectMocks
    private StudentProfileController studentProfileController;

    private final UserDetails testUser = User.builder()
            .username("student@gces.edu")
            .password("password")
            .roles("STUDENT")
            .build();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                return testUser;
            }
        };

        educationMockMvc = MockMvcBuilders.standaloneSetup(studentEducationController)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        experienceMockMvc = MockMvcBuilders.standaloneSetup(studentExperienceController)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        profileMockMvc = MockMvcBuilders.standaloneSetup(studentProfileController)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // --- Education Tests ---

    @Test
    @DisplayName("GET /api/student/education returns 200 with education list")
    void testGetEducation() throws Exception {
        StudentEducationResponse edu = new StudentEducationResponse(
                1L, "GCES", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "8.5", false, LocalDateTime.now()
        );
        when(studentProfileService.getEducation("student@gces.edu")).thenReturn(List.of(edu));

        educationMockMvc.perform(get("/student/education"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].institutionName").value("GCES"))
                .andExpect(jsonPath("$.data[0].degree").value("B.E. CSE"));
    }

    @Test
    @DisplayName("POST /api/student/education creates record and returns 201")
    void testAddEducation() throws Exception {
        StudentEducationRequest req = new StudentEducationRequest(
                "GCES", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "8.5", false
        );
        StudentEducationResponse res = new StudentEducationResponse(
                10L, "GCES", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "8.5", false, LocalDateTime.now()
        );
        when(studentProfileService.addEducation(eq("student@gces.edu"), any(StudentEducationRequest.class)))
                .thenReturn(res);

        educationMockMvc.perform(post("/student/education")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10L))
                .andExpect(jsonPath("$.data.institutionName").value("GCES"));
    }

    @Test
    @DisplayName("PUT /api/student/education/{id} updates record and returns 200")
    void testUpdateEducation() throws Exception {
        StudentEducationRequest req = new StudentEducationRequest(
                "Updated College", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "9.0", false
        );
        StudentEducationResponse res = new StudentEducationResponse(
                10L, "Updated College", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "9.0", false, LocalDateTime.now()
        );
        when(studentProfileService.updateEducation(eq("student@gces.edu"), eq(10L), any(StudentEducationRequest.class)))
                .thenReturn(res);

        educationMockMvc.perform(put("/student/education/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.institutionName").value("Updated College"));
    }

    @Test
    @DisplayName("DELETE /api/student/education/{id} deletes record and returns 200")
    void testDeleteEducation() throws Exception {
        doNothing().when(studentProfileService).deleteEducation("student@gces.edu", 10L);

        educationMockMvc.perform(delete("/student/education/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(studentProfileService).deleteEducation("student@gces.edu", 10L);
    }

    // --- Profile alias Education Tests ---

    @Test
    @DisplayName("GET /api/student/profile/education returns 200")
    void testProfileEducationEndpoint() throws Exception {
        StudentEducationResponse edu = new StudentEducationResponse(
                1L, "GCES", "B.E. CSE", "Anna University",
                (short) 2021, (short) 2025, "8.5", false, LocalDateTime.now()
        );
        when(studentProfileService.getEducation("student@gces.edu")).thenReturn(List.of(edu));

        profileMockMvc.perform(get("/student/profile/education"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].institutionName").value("GCES"));
    }

    // --- Experience / Internship Tests ---

    @Test
    @DisplayName("GET /api/student/experience returns 200 with experience list")
    void testGetExperience() throws Exception {
        StudentExperienceResponse exp = new StudentExperienceResponse(
                1L, "Software Engineer Intern", "Acme Corp", ExperienceType.INTERNSHIP,
                "Bangalore", LocalDate.of(2024, 5, 1), LocalDate.of(2024, 7, 31),
                false, "Developed microservices", LocalDateTime.now()
        );
        when(studentProfileService.getExperience("student@gces.edu")).thenReturn(List.of(exp));

        experienceMockMvc.perform(get("/student/experience"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].jobRole").value("Software Engineer Intern"))
                .andExpect(jsonPath("$.data[0].company").value("Acme Corp"));
    }

    @Test
    @DisplayName("POST /api/student/experience creates record and returns 201")
    void testAddExperience() throws Exception {
        StudentExperienceRequest req = new StudentExperienceRequest(
                "SDE Intern", "Amazon", ExperienceType.INTERNSHIP,
                "Chennai", LocalDate.of(2024, 6, 1), LocalDate.of(2024, 8, 31),
                "Worked on cloud infra", false
        );
        StudentExperienceResponse res = new StudentExperienceResponse(
                20L, "SDE Intern", "Amazon", ExperienceType.INTERNSHIP,
                "Chennai", LocalDate.of(2024, 6, 1), LocalDate.of(2024, 8, 31),
                false, "Worked on cloud infra", LocalDateTime.now()
        );
        when(studentProfileService.addExperience(eq("student@gces.edu"), any(StudentExperienceRequest.class)))
                .thenReturn(res);

        experienceMockMvc.perform(post("/student/experience")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(20L))
                .andExpect(jsonPath("$.data.company").value("Amazon"));
    }

    @Test
    @DisplayName("DELETE /api/student/experience/{id} deletes record and returns 200")
    void testDeleteExperience() throws Exception {
        doNothing().when(studentProfileService).deleteExperience("student@gces.edu", 20L);

        experienceMockMvc.perform(delete("/student/experience/20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(studentProfileService).deleteExperience("student@gces.edu", 20L);
    }
}
