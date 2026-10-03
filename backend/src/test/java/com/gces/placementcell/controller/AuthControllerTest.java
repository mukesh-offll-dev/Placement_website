package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.GlobalExceptionHandler;
import com.gces.placementcell.service.AuthService;
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

import java.time.LocalDateTime;
import java.util.Collections;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController Unit Tests")
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private MockMvc mockMvcWithPrincipal;
    private ObjectMapper objectMapper;

    private final UserDetails testPrincipal = new User("student@gces.edu", "secret", Collections.emptyList());

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        // MockMvc without authenticated principal (simulating unauthenticated request where userDetails resolves to null)
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                                                  ModelAndViewContainer mavContainer,
                                                  NativeWebRequest webRequest,
                                                  WebDataBinderFactory binderFactory) {
                        return null;
                    }
                })
                .build();

        // MockMvc with authenticated principal injected
        mockMvcWithPrincipal = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                                                  ModelAndViewContainer mavContainer,
                                                  NativeWebRequest webRequest,
                                                  WebDataBinderFactory binderFactory) {
                        return testPrincipal;
                    }
                })
                .build();
    }

    @Test
    @DisplayName("POST /auth/register/student returns 201 Created and AuthResponse")
    void testRegisterStudentSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "student@gces.edu", "Password123", "Test Student", "20CS001", UserRole.STUDENT);
        AuthResponse response = AuthResponse.builder()
                .token("jwt-token-xyz")
                .userId(1L)
                .email("student@gces.edu")
                .role(UserRole.STUDENT)
                .fullName("Test Student")
                .build();

        when(authService.registerStudent(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/auth/register/student")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("jwt-token-xyz")))
                .andExpect(jsonPath("$.data.email", is("student@gces.edu")));
    }

    @Test
    @DisplayName("POST /auth/login returns 200 OK and AuthResponse")
    void testLoginSuccess() throws Exception {
        LoginRequest request = new LoginRequest("student@gces.edu", "Password123");
        AuthResponse response = AuthResponse.builder()
                .token("jwt-token-xyz")
                .userId(1L)
                .email("student@gces.edu")
                .role(UserRole.STUDENT)
                .fullName("Test Student")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("jwt-token-xyz")));
    }

    @Test
    @DisplayName("GET /auth/me with authenticated principal returns 200 OK and UserResponse")
    void testGetCurrentUserAuthenticated() throws Exception {
        UserResponse userResponse = new UserResponse(
                1L, "student@gces.edu", UserRole.STUDENT, AccountStatus.ACTIVE,
                true, false, null, LocalDateTime.now());

        when(authService.getCurrentUser("student@gces.edu")).thenReturn(userResponse);

        mockMvcWithPrincipal.perform(get("/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.email", is("student@gces.edu")))
                .andExpect(jsonPath("$.data.role", is("STUDENT")))
                .andExpect(jsonPath("$.data.accountStatus", is("ACTIVE")))
                .andExpect(jsonPath("$.data.isActive", is(true)))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    @DisplayName("GET /auth/me without authenticated principal returns 401 Unauthorized")
    void testGetCurrentUserUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Authentication failed")));
    }
}
