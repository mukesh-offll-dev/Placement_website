package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.StudentSkillResponse;
import com.gces.placementcell.entity.enums.SkillProficiency;
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

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentSkillController Unit Tests")
class StudentSkillControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private StudentProfileService studentProfileService;

    @InjectMocks
    private StudentSkillController studentSkillController;

    private final UserDetails testUser = User.builder()
            .username("student@gces.edu")
            .password("password")
            .roles("STUDENT")
            .build();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

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

        mockMvc = MockMvcBuilders.standaloneSetup(studentSkillController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("GET /student/skills returns list of student skills")
    void testGetSkillsSuccess() throws Exception {
        StudentSkillResponse skill = new StudentSkillResponse(1L, "React", SkillProficiency.INTERMEDIATE);
        when(studentProfileService.getSkills("student@gces.edu")).thenReturn(List.of(skill));

        mockMvc.perform(get("/student/skills"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].skillName", is("React")));
    }

    @Test
    @DisplayName("POST /student/skills creates new skill")
    void testAddSkillSuccess() throws Exception {
        StudentSkillRequest request = new StudentSkillRequest("Kotlin", SkillProficiency.INTERMEDIATE);
        StudentSkillResponse response = new StudentSkillResponse(5L, "Kotlin", SkillProficiency.INTERMEDIATE);
        when(studentProfileService.addSkill(eq("student@gces.edu"), any(StudentSkillRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/student/skills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.skillName", is("Kotlin")));
    }

    @Test
    @DisplayName("PUT /student/skills/{id} updates existing skill")
    void testUpdateSkillSuccess() throws Exception {
        StudentSkillRequest request = new StudentSkillRequest("Kotlin Advanced", SkillProficiency.ADVANCED);
        StudentSkillResponse response = new StudentSkillResponse(5L, "Kotlin Advanced", SkillProficiency.ADVANCED);
        when(studentProfileService.updateSkill(eq("student@gces.edu"), eq(5L), any(StudentSkillRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/student/skills/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.skillName", is("Kotlin Advanced")));
    }

    @Test
    @DisplayName("DELETE /student/skills/{id} deletes skill")
    void testDeleteSkillSuccess() throws Exception {
        doNothing().when(studentProfileService).deleteSkill("student@gces.edu", 5L);

        mockMvc.perform(delete("/student/skills/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }
}

