package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.StudentProjectResponse;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.GlobalExceptionHandler;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.StudentProfileService;
import com.gces.placementcell.service.StudentProjectService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Student Profile and Project Controller Unit Tests")
class StudentProfileAndProjectControllerTest {

    private MockMvc profileMockMvc;
    private MockMvc projectMockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private StudentProfileService studentProfileService;

    @Mock
    private StudentProjectService studentProjectService;

    @InjectMocks
    private StudentProfileController studentProfileController;

    @InjectMocks
    private StudentProjectController studentProjectController;

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

        profileMockMvc = MockMvcBuilders.standaloneSetup(studentProfileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();

        projectMockMvc = MockMvcBuilders.standaloneSetup(studentProjectController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    // =========================================================================
    // Student Profile Controller Tests
    // =========================================================================

    @Test
    @DisplayName("GET /student/profile returns 200 and student profile")
    void testGetProfileSuccess() throws Exception {
        StudentProfileResponse mockResponse = createSampleProfileResponse();
        when(studentProfileService.getProfile("student@gces.edu")).thenReturn(mockResponse);

        profileMockMvc.perform(get("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fullName", is("Adithya Kumar")))
                .andExpect(jsonPath("$.data.email", is("student@gces.edu")))
                .andExpect(jsonPath("$.data.rollNo", is("811521104001")));

        verify(studentProfileService).getProfile("student@gces.edu");
    }

    @Test
    @DisplayName("GET /student/profile returns 404 when profile not found")
    void testGetProfileNotFound() throws Exception {
        when(studentProfileService.getProfile("student@gces.edu"))
                .thenThrow(new ResourceNotFoundException("Student profile not found for user: student@gces.edu"));

        profileMockMvc.perform(get("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Student profile not found")));
    }

    @Test
    @DisplayName("POST /student/profile creates profile and returns 201")
    void testCreateProfileSuccess() throws Exception {
        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "Software Engineer aspirant",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "Computer Science",
                "CSE",
                "2021-2025",
                (short) 7,
                new BigDecimal("8.50"),
                0,
                0,
                true
        );

        StudentProfileResponse mockResponse = createSampleProfileResponse();
        when(studentProfileService.createProfile(eq("student@gces.edu"), any(StudentProfileRequest.class)))
                .thenReturn(mockResponse);

        profileMockMvc.perform(post("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Profile created successfully")))
                .andExpect(jsonPath("$.data.fullName", is("Adithya Kumar")));

        verify(studentProfileService).createProfile(eq("student@gces.edu"), any(StudentProfileRequest.class));
    }

    @Test
    @DisplayName("POST /student/profile returns 409 if profile already exists")
    void testCreateProfileDuplicateThrows() throws Exception {
        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar",
                "811521104001",
                "student@gces.edu",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        when(studentProfileService.createProfile(eq("student@gces.edu"), any(StudentProfileRequest.class)))
                .thenThrow(new DuplicateResourceException("Profile already exists for this student. Use PUT /api/student/profile to update."));

        profileMockMvc.perform(post("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Profile already exists")));
    }

    @Test
    @DisplayName("PUT /student/profile updates profile and returns 200")
    void testUpdateProfileSuccess() throws Exception {
        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar Updated",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Chennai",
                "Updated bio",
                null, null, null, null, null, null, null, null, null, null, null, null
        );

        StudentProfileResponse mockResponse = createSampleProfileResponse();
        when(studentProfileService.updateProfile(eq("student@gces.edu"), any(StudentProfileRequest.class)))
                .thenReturn(mockResponse);

        profileMockMvc.perform(put("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Profile updated successfully")));

        verify(studentProfileService).updateProfile(eq("student@gces.edu"), any(StudentProfileRequest.class));
    }

    @Test
    @DisplayName("POST /student/profile validation fails with blank full name returning 400")
    void testCreateProfileValidationFailure() throws Exception {
        // Missing required fullName
        String invalidJson = "{\"fullName\": \"\", \"email\": \"student@gces.edu\"}";

        profileMockMvc.perform(post("/student/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.data.fullName").exists());
    }

    // =========================================================================
    // Student Project Controller Tests
    // =========================================================================

    @Test
    @DisplayName("POST /student/projects creates project and returns 201")
    void testCreateProjectSuccess() throws Exception {
        StudentProjectRequest request = new StudentProjectRequest(
                "Placement Portal",
                "Comprehensive portal for student campus placements",
                "https://placement.live",
                "https://github.com/student/placement",
                null,
                List.of("Java", "Spring Boot", "React")
        );

        StudentProjectResponse mockResponse = new StudentProjectResponse(
                10L,
                "Placement Portal",
                "Comprehensive portal for student campus placements",
                "https://placement.live",
                "https://github.com/student/placement",
                null,
                List.of("Java", "Spring Boot", "React"),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(studentProjectService.createProject(eq("student@gces.edu"), any(StudentProjectRequest.class)))
                .thenReturn(mockResponse);

        projectMockMvc.perform(post("/student/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Project created successfully")))
                .andExpect(jsonPath("$.data.id", is(10)))
                .andExpect(jsonPath("$.data.title", is("Placement Portal")))
                .andExpect(jsonPath("$.data.techStack", hasSize(3)));

        verify(studentProjectService).createProject(eq("student@gces.edu"), any(StudentProjectRequest.class));
    }

    @Test
    @DisplayName("POST /student/projects validation fails with blank title returning 400")
    void testCreateProjectBlankTitle() throws Exception {
        String invalidJson = "{\"title\": \"\", \"description\": \"Test project\"}";

        projectMockMvc.perform(post("/student/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.data.title").exists());
    }

    @Test
    @DisplayName("GET /student/projects returns 200 and list of projects")
    void testGetAllProjects() throws Exception {
        StudentProjectResponse project1 = new StudentProjectResponse(
                1L, "Project 1", "Desc 1", null, null, null, List.of("Java"), LocalDateTime.now(), LocalDateTime.now()
        );
        StudentProjectResponse project2 = new StudentProjectResponse(
                2L, "Project 2", "Desc 2", null, null, null, List.of("Python"), LocalDateTime.now(), LocalDateTime.now()
        );

        when(studentProjectService.getAllProjects("student@gces.edu")).thenReturn(List.of(project1, project2));

        projectMockMvc.perform(get("/student/projects")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", is("Project 1")))
                .andExpect(jsonPath("$.data[1].title", is("Project 2")));

        verify(studentProjectService).getAllProjects("student@gces.edu");
    }

    @Test
    @DisplayName("GET /student/projects/{id} returns 200 and project details")
    void testGetProjectByIdSuccess() throws Exception {
        StudentProjectResponse mockResponse = new StudentProjectResponse(
                1L, "Project 1", "Desc 1", null, null, null, List.of("Java"), LocalDateTime.now(), LocalDateTime.now()
        );

        when(studentProjectService.getProjectById("student@gces.edu", 1L)).thenReturn(mockResponse);

        projectMockMvc.perform(get("/student/projects/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.title", is("Project 1")));

        verify(studentProjectService).getProjectById("student@gces.edu", 1L);
    }

    @Test
    @DisplayName("GET /student/projects/{id} returns 404 when project not found or not owned")
    void testGetProjectByIdNotFound() throws Exception {
        when(studentProjectService.getProjectById("student@gces.edu", 999L))
                .thenThrow(new ResourceNotFoundException("Project not found with id: 999"));

        projectMockMvc.perform(get("/student/projects/999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Project not found with id: 999")));
    }

    @Test
    @DisplayName("PUT /student/projects/{id} updates project and returns 200")
    void testUpdateProjectSuccess() throws Exception {
        StudentProjectRequest request = new StudentProjectRequest(
                "Updated Project Title",
                "Updated description",
                "https://updated.live",
                "https://github.com/updated",
                null,
                List.of("TypeScript", "Next.js")
        );

        StudentProjectResponse mockResponse = new StudentProjectResponse(
                1L,
                "Updated Project Title",
                "Updated description",
                "https://updated.live",
                "https://github.com/updated",
                null,
                List.of("TypeScript", "Next.js"),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(studentProjectService.updateProject(eq("student@gces.edu"), eq(1L), any(StudentProjectRequest.class)))
                .thenReturn(mockResponse);

        projectMockMvc.perform(put("/student/projects/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Project updated successfully")))
                .andExpect(jsonPath("$.data.title", is("Updated Project Title")));

        verify(studentProjectService).updateProject(eq("student@gces.edu"), eq(1L), any(StudentProjectRequest.class));
    }

    @Test
    @DisplayName("DELETE /student/projects/{id} deletes project and returns 200")
    void testDeleteProjectSuccess() throws Exception {
        doNothing().when(studentProjectService).deleteProject("student@gces.edu", 1L);

        projectMockMvc.perform(delete("/student/projects/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Project deleted successfully")));

        verify(studentProjectService).deleteProject("student@gces.edu", 1L);
    }

    @Test
    @DisplayName("DELETE /student/projects/{id} returns 404 when project not owned by student")
    void testDeleteProjectNotOwnedThrows404() throws Exception {
        doThrow(new ResourceNotFoundException("Project not found with id: 1"))
                .when(studentProjectService).deleteProject("student@gces.edu", 1L);

        projectMockMvc.perform(delete("/student/projects/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Project not found with id: 1")));
    }

    // Helper method
    private StudentProfileResponse createSampleProfileResponse() {
        UserResponse userResponse = new UserResponse(
                1L, "student@gces.edu", UserRole.STUDENT, AccountStatus.ACTIVE, true, true, null, LocalDateTime.now()
        );
        return new StudentProfileResponse(
                10L,
                userResponse,
                "811521104001",
                "Adithya Kumar",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "Software Engineer aspirant",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "Computer Science and Engineering",
                "CSE",
                "2021-2025",
                (short) 7,
                new BigDecimal("8.50"),
                0,
                0,
                PlacementStatus.PENDING,
                true,
                null,
                null,
                null,
                (short) 75,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}
