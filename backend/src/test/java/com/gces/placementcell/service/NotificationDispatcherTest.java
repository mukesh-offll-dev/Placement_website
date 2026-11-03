package com.gces.placementcell.service;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.NotificationRecipient;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.NotificationRepository;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("In-app + email notification dispatch")
class NotificationDispatcherTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private JobRepository jobRepository;
    @Mock private TransactionTemplate transactionTemplate;
    @Mock private EmailJsMailer mailer;

    private final User admin = User.builder().id(1L).email("admin@gces.edu").build();
    private final User asha = User.builder().id(2L).email("asha@example.com").build();
    private final User ravi = User.builder().id(3L).email("ravi@example.com").build();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        when(transactionTemplate.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
        when(mailer.isConfigured()).thenReturn(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findAllById(any())).thenReturn(List.of(asha, ravi));
    }

    private NotificationDispatcher dispatcher(boolean mailEnabled) {
        return new NotificationDispatcher(notificationRepository, userRepository, jobRepository,
                transactionTemplate, mailer, mailEnabled, "http://localhost:5173/");
    }

    private static UserNotificationEvent event(boolean sendEmail) {
        return new UserNotificationEvent(List.of(2L, 3L), 1L, "Application update: Shortlisted",
                "You were shortlisted.", NotificationType.APPLICATION, NotificationPriority.NORMAL,
                null, "/student/applications", sendEmail);
    }

    @Test
    @DisplayName("Stores one published notification with an unread row per recipient")
    void storesInApp() {
        int stored = dispatcher(false).dispatch(event(true));

        assertEquals(2, stored);
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();
        assertEquals(NotificationStatus.PUBLISHED, saved.getStatus());
        assertEquals(admin, saved.getCreatedBy());
        assertEquals(NotificationType.APPLICATION, saved.getNotificationType());
        assertEquals(2, saved.getRecipients().size());
        assertTrue(saved.getRecipients().stream().noneMatch(NotificationRecipient::getIsRead));
        verify(mailer, never()).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Emails every recipient separately with the same text and a portal link")
    void emailsRecipients() {
        dispatcher(true).dispatch(event(true));

        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailer, times(2)).send(to.capture(), any(), subject.capture(), body.capture());
        assertEquals(List.of("asha@example.com", "ravi@example.com"), to.getAllValues());
        assertEquals("Application update: Shortlisted", subject.getAllValues().get(0));
        assertTrue(body.getAllValues().get(0).contains("You were shortlisted."));
        assertTrue(body.getAllValues().get(0).contains("http://localhost:5173/student/applications"));
    }

    @Test
    @DisplayName("sendEmail=false stores in-app only")
    void inAppOnly() {
        dispatcher(true).dispatch(event(false));

        verify(notificationRepository).save(any(Notification.class));
        verify(mailer, never()).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Nothing is sent when EmailJS is not configured, but the in-app copy is kept")
    void notConfigured() {
        when(mailer.isConfigured()).thenReturn(false);

        assertEquals(2, dispatcher(true).dispatch(event(true)));
        verify(mailer, never()).send(any(), any(), any(), any());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("One failed email does not stop the others, and the in-app copy is kept")
    void failureIsolated() {
        doThrow(new EmailJsMailer.EmailDeliveryException("rejected")).when(mailer)
                .send(org.mockito.ArgumentMatchers.eq("asha@example.com"), any(), any(), any());

        assertEquals(2, dispatcher(true).dispatch(event(true)));
        verify(mailer, times(2)).send(any(), any(), any(), any());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Deleted or inactive users get nothing")
    void skipsInactiveUsers() {
        User gone = User.builder().id(4L).email("gone@example.com").isDeleted(true).build();
        when(userRepository.findAllById(any())).thenReturn(List.of(asha, gone));

        assertEquals(1, dispatcher(false).dispatch(event(false)));
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals(1, captor.getValue().getRecipients().size());
    }

    @Test
    @DisplayName("Line breaks in the title cannot inject mail headers")
    void subjectIsSingleLine() {
        when(userRepository.findAllById(any())).thenReturn(List.of(asha));
        UserNotificationEvent evil = new UserNotificationEvent(List.of(2L), 1L,
                "New application\r\nBcc: attacker@example.com", "msg", NotificationType.APPLICATION,
                NotificationPriority.NORMAL, null, null, true);

        dispatcher(true).dispatch(evil);

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(any(), any(), subject.capture(), any());
        assertFalse(subject.getValue().contains("\n"));
        assertFalse(subject.getValue().contains("\r"));
    }

    @Test
    @DisplayName("No recipients means nothing is stored")
    void noRecipients() {
        UserNotificationEvent empty = new UserNotificationEvent(List.of(), 1L, "t", "m",
                NotificationType.GENERAL, NotificationPriority.NORMAL, null, null, true);

        assertEquals(0, dispatcher(true).dispatch(empty));
        verify(notificationRepository, never()).save(any(Notification.class));
    }
}
