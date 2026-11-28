package com.gces.placementcell.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.GlobalExceptionHandler;
import com.gces.placementcell.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PasswordResetController")
class PasswordResetControllerTest {

    @Mock private PasswordResetService passwordResetService;
    @InjectMocks private PasswordResetController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private String json(Map<String, String> body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    @Test
    @DisplayName("Forgot password gives the same 200 and message for any identifier")
    void forgotIsGeneric() throws Exception {
        for (String identifier : new String[]{"officer@gces.edu", "nobody@example.com", "830123104001"}) {
            mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("identifier", identifier))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.message", is(PasswordResetController.GENERIC_FORGOT_MESSAGE)));
        }
        verify(passwordResetService).requestReset("nobody@example.com");
    }

    @Test
    @DisplayName("Forgot password needs an identifier")
    void forgotNeedsIdentifier() throws Exception {
        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("identifier", "  "))))
                .andExpect(status().isBadRequest());
        verify(passwordResetService, never()).requestReset(anyString());
    }

    @Test
    @DisplayName("Reset with a weak password is a 400 and never reaches the service")
    void weakPasswordRejected() throws Exception {
        for (String weak : new String[]{"short1A", "alllowercase123", "NoDigitsHere", ""}) {
            mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("token", "abc", "newPassword", weak))))
                    .andExpect(status().isBadRequest());
        }
        verify(passwordResetService, never()).resetPassword(any(), any());
    }

    @Test
    @DisplayName("Reset needs the token from the link")
    void tokenRequired() throws Exception {
        mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "", "newPassword", "GoodPass123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("An invalid or expired link is a 400 with its message")
    void invalidLink() throws Exception {
        doThrow(new BadRequestException("This reset link is invalid or has expired. Request a new one."))
                .when(passwordResetService).resetPassword("stale", "GoodPass123");

        mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "stale", "newPassword", "GoodPass123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("invalid or has expired")));
    }

    @Test
    @DisplayName("A valid reset answers 200 and names the role, so the page can pick the sign-in")
    void resetOk() throws Exception {
        when(passwordResetService.resetPassword("fresh", "GoodPass123")).thenReturn(UserRole.FACULTY_ADVISOR);
        mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "fresh", "newPassword", "GoodPass123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.role", is("FACULTY_ADVISOR")));
        verify(passwordResetService).resetPassword("fresh", "GoodPass123");
    }
}
