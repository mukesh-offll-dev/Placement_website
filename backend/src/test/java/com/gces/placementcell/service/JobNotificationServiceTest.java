package com.gces.placementcell.service;

import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
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
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Job alert emails")
class JobNotificationServiceTest {

    @Mock private JobRepository jobRepository;
    @Mock private StudentProfileRepository studentRepository;
    @Mock private TransactionTemplate transactionTemplate;
    @Mock private EmailJsMailer mailer;
    @Mock private NotificationDispatcher dispatcher;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        // Run the callback inline instead of opening a real transaction.
        when(transactionTemplate.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
        when(mailer.isConfigured()).thenReturn(true);
    }

    private JobNotificationService service(boolean enabled) {
        return new JobNotificationService(jobRepository, studentRepository, transactionTemplate,
                mailer, enabled, "http://localhost:5173/", dispatcher);
    }

    private static Job openJob() {
        Job job = Job.builder()
                .company(Company.builder().name("Zoho").build())
                .jobRole("SDE")
                .location("Chennai")
                .ctcText("8 LPA")
                .minCgpa(new BigDecimal("7.50"))
                .backlogsAllowed(false)
                .applicationDeadline(LocalDate.now().plusDays(10))
                .build();
        job.setId(42L);
        return job;
    }

    private static StudentProfile student(String name, String email, String cgpa) {
        return StudentProfile.builder().fullName(name).email(email).cgpa(new BigDecimal(cgpa)).build();
    }

    @Test
    @DisplayName("Emails only the eligible students, one message each, with a link to the job")
    void sendsToEligibleOnly() {
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(openJob()));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(
                student("Asha Rao", "asha@example.com", "8.5"),
                student("Ravi Kumar", "ravi@example.com", "6.0"),
                student("Meena S", "meena@example.com", "7.5")));

        int sent = service(true).notifyEligibleStudents(42L);

        assertEquals(2, sent);
        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailer, times(2)).send(to.capture(), any(), subject.capture(), body.capture());

        assertEquals(List.of("asha@example.com", "meena@example.com"), to.getAllValues(),
                "each eligible student gets their own message");
        assertEquals("New job drive: SDE at Zoho", subject.getAllValues().get(0));
        assertTrue(body.getAllValues().get(0).startsWith("Hi Asha,"));
        assertTrue(body.getAllValues().get(0).contains("http://localhost:5173/student/jobs/42"));
    }

    @Test
    @DisplayName("With email disabled, students still get the in-app notification but no mail")
    void disabled() {
        Job job = openJob();
        job.setPostedBy(User.builder().id(1L).build());
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(job));
        StudentProfile asha = student("Asha Rao", "asha@example.com", "8.5");
        asha.setUser(User.builder().id(7L).build());
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(asha));

        assertEquals(0, service(false).notifyEligibleStudents(42L));

        verify(mailer, never()).send(any(), any(), any(), any());
        ArgumentCaptor<UserNotificationEvent> captor = ArgumentCaptor.forClass(UserNotificationEvent.class);
        verify(dispatcher).dispatch(captor.capture());
        UserNotificationEvent event = captor.getValue();
        assertEquals(List.of(7L), List.copyOf(event.recipientUserIds()));
        assertEquals(1L, event.createdByUserId());
        assertEquals("New job drive: SDE at Zoho", event.title());
        assertEquals("/student/jobs/42", event.linkPath());
        assertFalse(event.sendEmail(), "the job email template is sent by JobNotificationService itself");
    }

    @Test
    @DisplayName("Does nothing when EmailJS is not configured")
    void notConfigured() {
        when(mailer.isConfigured()).thenReturn(false);
        assertEquals(0, service(true).notifyEligibleStudents(42L));
        verify(mailer, never()).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("A closed job sends nothing")
    void closedJob() {
        Job job = openJob();
        job.setApplicationDeadline(LocalDate.now().minusDays(1));
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(job));

        assertEquals(0, service(true).notifyEligibleStudents(42L));
        verify(mailer, never()).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("One failed delivery does not stop the rest")
    void failureIsolated() {
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(openJob()));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(
                student("Asha Rao", "bad@example.com", "9"),
                student("Meena S", "meena@example.com", "9")));
        doThrow(new EmailJsMailer.EmailDeliveryException("rejected")).when(mailer)
                .send(org.mockito.ArgumentMatchers.eq("bad@example.com"), any(), any(), any());

        assertEquals(1, service(true).notifyEligibleStudents(42L));
        verify(mailer, times(2)).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Line breaks in the role cannot inject extra mail headers")
    void subjectIsSingleLine() {
        Job job = openJob();
        job.setJobRole("SDE\r\nBcc: attacker@example.com");
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(job));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(student("Asha", "asha@example.com", "9")));

        service(true).notifyEligibleStudents(42L);

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(any(), any(), subject.capture(), any());
        assertFalse(subject.getValue().contains("\n"));
        assertFalse(subject.getValue().contains("\r"));
    }

    @Test
    @DisplayName("Placed and blocked students are excluded from the candidate query")
    void queriesOnlyAlertableStatuses() {
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(openJob()));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of());

        service(true).notifyEligibleStudents(42L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<PlacementStatus>> captor = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(studentRepository).findNotifiableStudents(captor.capture());
        assertTrue(captor.getValue().containsAll(List.of(PlacementStatus.PENDING, PlacementStatus.ACTIVE)));
        assertFalse(captor.getValue().contains(PlacementStatus.PLACED));
        assertFalse(captor.getValue().contains(PlacementStatus.BLOCKED));
    }
}
