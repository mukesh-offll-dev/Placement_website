package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.NotificationRecipient;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.NotificationRecipientRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationServiceImpl Unit Tests")
class NotificationServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRecipientRepository recipientRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User testUser;
    private Notification notification;
    private NotificationRecipient recipient;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("user@gces.edu")
                .role(UserRole.STUDENT)
                .isActive(true)
                .isDeleted(false)
                .build();

        notification = Notification.builder()
                .id(100L)
                .title("New Placement Drive")
                .message("Google India drive announced")
                .notificationType(NotificationType.JOB)
                .priority(NotificationPriority.HIGH)
                .createdAt(LocalDateTime.now())
                .build();

        recipient = NotificationRecipient.builder()
                .id(50L)
                .notification(notification)
                .user(testUser)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getMyNotifications returns paged notifications for logged-in user")
    void testGetMyNotificationsSuccess() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(recipient), pageable, 1));

        PagedResponse<NotificationResponse> response = notificationService.getMyNotifications("user@gces.edu", false, pageable);

        assertNotNull(response);
        assertEquals(1, response.totalElements());
        assertEquals(1, response.content().size());
        assertEquals(100L, response.content().get(0).id());
        assertEquals("New Placement Drive", response.content().get(0).title());
        assertFalse(response.content().get(0).isRead());
    }

    @Test
    @DisplayName("getMyNotifications returns unread only when requested")
    void testGetMyNotificationsUnreadOnly() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(recipient), pageable, 1));

        PagedResponse<NotificationResponse> response = notificationService.getMyNotifications("user@gces.edu", true, pageable);

        assertNotNull(response);
        assertEquals(1, response.totalElements());
        verify(recipientRepository).findByUserIdAndIsReadFalseOrderByCreatedAtDesc(1L, pageable);
    }

    @Test
    @DisplayName("getUnreadCount returns correct unread count")
    void testGetUnreadCountSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.countByUserIdAndIsReadFalse(1L)).thenReturn(5L);

        long count = notificationService.getUnreadCount("user@gces.edu");

        assertEquals(5L, count);
    }

    @Test
    @DisplayName("markAsRead updates notification read state and timestamp")
    void testMarkAsReadSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByNotificationIdAndUserId(100L, 1L)).thenReturn(Optional.of(recipient));
        when(recipientRepository.save(any(NotificationRecipient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = notificationService.markAsRead("user@gces.edu", 100L);

        assertNotNull(response);
        assertTrue(response.isRead());
        assertNotNull(response.readAt());
        verify(recipientRepository).save(recipient);
    }

    @Test
    @DisplayName("markAsUnread resets notification read state")
    void testMarkAsUnreadSuccess() {
        recipient.markAsRead();
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByNotificationIdAndUserId(100L, 1L)).thenReturn(Optional.of(recipient));
        when(recipientRepository.save(any(NotificationRecipient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = notificationService.markAsUnread("user@gces.edu", 100L);

        assertNotNull(response);
        assertFalse(response.isRead());
        assertNull(response.readAt());
    }

    @Test
    @DisplayName("markAllAsRead invokes repository bulk update")
    void testMarkAllAsReadSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));

        notificationService.markAllAsRead("user@gces.edu");

        verify(recipientRepository).markAllAsReadForUser(eq(1L), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("deleteNotification removes recipient record for logged-in user")
    void testDeleteNotificationSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByNotificationIdAndUserId(100L, 1L)).thenReturn(Optional.of(recipient));

        notificationService.deleteNotification("user@gces.edu", 100L);

        verify(recipientRepository).delete(recipient);
    }

    @Test
    @DisplayName("markAsRead throws ResourceNotFoundException when notification not found for user")
    void testMarkAsReadNotFoundThrows() {
        when(userRepository.findByEmailAndIsDeletedFalse("user@gces.edu")).thenReturn(Optional.of(testUser));
        when(recipientRepository.findByNotificationIdAndUserId(999L, 1L)).thenReturn(Optional.empty());
        when(recipientRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead("user@gces.edu", 999L));
    }

    @Test
    @DisplayName("operations throw ResourceNotFoundException when user not found")
    void testUserNotFoundThrows() {
        when(userRepository.findByEmailAndIsDeletedFalse("absent@gces.edu")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.getUnreadCount("absent@gces.edu"));
    }
}
