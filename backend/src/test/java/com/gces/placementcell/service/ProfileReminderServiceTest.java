package com.gces.placementcell.service;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Incomplete profile reminders")
class ProfileReminderServiceTest {

    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;

    private ProfileReminderService service;
    private final User admin = User.builder().id(1L).email("admin@gces.edu").role(UserRole.ADMIN).build();

    @BeforeEach
    void setUp() {
        service = new ProfileReminderService(studentProfileRepository, userRepository, eventPublisher, true, 7);
    }

    private static StudentProfile student(long userId, String phone, BigDecimal cgpa, String resumeUrl) {
        return StudentProfile.builder()
                .user(User.builder().id(userId).email("s" + userId + "@example.com").build())
                .fullName("Student " + userId)
                .email("s" + userId + "@example.com")
                .phone(phone)
                .department("Computer Science (CSE)")
                .batch("2022-2026")
                .cgpa(cgpa)
                .resumeUrl(resumeUrl)
                .profileCompletionPercent(40)
                .build();
    }

    @Test
    @DisplayName("Reminds each due student once, by in-app notification and email, and records it")
    void remindsDueStudents() {
        StudentProfile missingCgpaAndResume = student(7L, "9876543210", null, null);
        when(userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN)).thenReturn(List.of(admin));
        when(studentProfileRepository.findNeedingProfileReminder(any(LocalDateTime.class)))
                .thenReturn(List.of(missingCgpaAndResume));

        int reminded = service.sendReminders();

        assertEquals(1, reminded);
        ArgumentCaptor<UserNotificationEvent> captor = ArgumentCaptor.forClass(UserNotificationEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        UserNotificationEvent event = captor.getValue();
        assertEquals(List.of(7L), List.copyOf(event.recipientUserIds()));
        assertEquals(1L, event.createdByUserId());
        assertTrue(event.sendEmail());
        assertEquals("/student/profile", event.linkPath());
        assertTrue(event.message().contains("CGPA") && event.message().contains("resume"));
        assertNotNull(missingCgpaAndResume.getProfileReminderSentAt(), "so they are not reminded again for a week");
        verify(studentProfileRepository).save(missingCgpaAndResume);
    }

    @Test
    @DisplayName("Skips a student with nothing left to fill in")
    void skipsCompleteProfiles() {
        StudentProfile complete = student(8L, "9876543210", new BigDecimal("8.5"), "https://files/resume.pdf");
        when(userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN)).thenReturn(List.of(admin));
        when(studentProfileRepository.findNeedingProfileReminder(any(LocalDateTime.class))).thenReturn(List.of(complete));

        assertEquals(0, service.sendReminders());

        verify(eventPublisher, never()).publishEvent(any(Object.class));
        assertNull(complete.getProfileReminderSentAt());
    }

    @Test
    @DisplayName("Sends nothing when there is no admin account to send from")
    void needsAnAdminSender() {
        when(userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN)).thenReturn(List.of());

        assertEquals(0, service.sendReminders());

        verify(studentProfileRepository, never()).findNeedingProfileReminder(any(LocalDateTime.class));
    }

    @Test
    @DisplayName("The scheduled run does nothing while reminders are switched off")
    void disabledSwitch() {
        ProfileReminderService off = new ProfileReminderService(
                studentProfileRepository, userRepository, eventPublisher, false, 7);

        off.sendScheduledReminders();

        verify(userRepository, never()).findByRoleAndIsActiveTrueAndIsDeletedFalse(any(UserRole.class));
    }
}
