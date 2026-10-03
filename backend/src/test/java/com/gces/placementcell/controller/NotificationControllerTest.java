package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.TargetAudience;
import com.gces.placementcell.exception.GlobalExceptionHandler;
import com.gces.placementcell.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationController Unit Tests")
class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationController notificationController;

    private MockMvc mockMvc;

    private final UserDetails testUser = new User("user@gces.edu", "secret", Collections.emptyList());

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(notificationController)
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
                        return testUser;
                    }
                })
                .build();
    }

    private NotificationResponse sampleNotificationResponse() {
        return new NotificationResponse(
                100L,
                "New Placement Drive",
                "Google India drive announced",
                NotificationType.JOB,
                NotificationPriority.HIGH,
                TargetAudience.ALL,
                NotificationStatus.PUBLISHED,
                10L,
                "Software Engineer",
                null,
                null,
                LocalDateTime.now(),
                null,
                false,
                null,
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /notifications returns paged notifications for logged-in user")
    void testGetMyNotifications_Success() throws Exception {
        var page = new PageImpl<>(List.of(sampleNotificationResponse()), PageRequest.of(0, 20), 1);
        var pagedResponse = PagedResponse.of(page);

        when(notificationService.getMyNotifications(eq("user@gces.edu"), eq(false), any()))
                .thenReturn(pagedResponse);

        mockMvc.perform(get("/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(100))
                .andExpect(jsonPath("$.data.content[0].title").value("New Placement Drive"));
    }

    @Test
    @DisplayName("GET /notifications/unread-count returns unread count")
    void testGetUnreadCount_Success() throws Exception {
        when(notificationService.getUnreadCount("user@gces.edu")).thenReturn(3L);

        mockMvc.perform(get("/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(3));
    }

    @Test
    @DisplayName("PATCH /notifications/{id}/read marks notification read")
    void testMarkAsRead_Success() throws Exception {
        NotificationResponse readResponse = new NotificationResponse(
                100L, "New Placement Drive", "Google India drive announced",
                NotificationType.JOB, NotificationPriority.HIGH, TargetAudience.ALL,
                NotificationStatus.PUBLISHED, 10L, "Software Engineer", null, null,
                LocalDateTime.now(), null, true, LocalDateTime.now(), LocalDateTime.now()
        );

        when(notificationService.markAsRead("user@gces.edu", 100L)).thenReturn(readResponse);

        mockMvc.perform(patch("/notifications/100/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isRead").value(true));
    }

    @Test
    @DisplayName("PATCH /notifications/{id}/unread marks notification unread")
    void testMarkAsUnread_Success() throws Exception {
        NotificationResponse unreadResponse = sampleNotificationResponse();

        when(notificationService.markAsUnread("user@gces.edu", 100L)).thenReturn(unreadResponse);

        mockMvc.perform(patch("/notifications/100/unread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isRead").value(false));
    }

    @Test
    @DisplayName("PATCH /notifications/read-all marks all notifications read")
    void testMarkAllAsRead_Success() throws Exception {
        doNothing().when(notificationService).markAllAsRead("user@gces.edu");

        mockMvc.perform(patch("/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("All notifications marked as read"));
    }

    @Test
    @DisplayName("DELETE /notifications/{id} deletes notification from feed")
    void testDeleteNotification_Success() throws Exception {
        doNothing().when(notificationService).deleteNotification("user@gces.edu", 100L);

        mockMvc.perform(delete("/notifications/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Notification deleted successfully"));
    }
}
