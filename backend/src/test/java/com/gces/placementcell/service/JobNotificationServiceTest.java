package com.gces.placementcell.service;

import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.StudentProfile;
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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private JavaMailSender mailSender;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        // Run the callback inline instead of opening a real transaction.
        when(transactionTemplate.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
    }

    private JobNotificationService service(boolean enabled, String from) {
        return new JobNotificationService(jobRepository, studentRepository, transactionTemplate,
                mailSenderProvider, enabled, from, "", "http://localhost:5173/");
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

        int sent = service(true, "placement@gces.edu").notifyEligibleStudents(42L);

        assertEquals(2, sent);
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(captor.capture());

        SimpleMailMessage first = captor.getAllValues().get(0);
        assertEquals("placement@gces.edu", first.getFrom());
        assertEquals("asha@example.com", first.getTo()[0]);
        assertEquals(1, first.getTo().length, "each student gets their own message");
        assertEquals("New job drive: SDE at Zoho", first.getSubject());
        assertTrue(first.getText().startsWith("Hi Asha,"));
        assertTrue(first.getText().contains("http://localhost:5173/student/jobs/42"));
        assertFalse(captor.getAllValues().stream().anyMatch(m -> m.getTo()[0].equals("ravi@example.com")));
    }

    @Test
    @DisplayName("Does nothing while alerts are disabled")
    void disabled() {
        assertEquals(0, service(false, "placement@gces.edu").notifyEligibleStudents(42L));
        verifyNoInteractions(mailSender, jobRepository, studentRepository);
    }

    @Test
    @DisplayName("Does nothing when no sender address is configured")
    void noFromAddress() {
        assertEquals(0, service(true, "").notifyEligibleStudents(42L));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("A closed job sends nothing")
    void closedJob() {
        Job job = openJob();
        job.setApplicationDeadline(LocalDate.now().minusDays(1));
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(job));

        assertEquals(0, service(true, "placement@gces.edu").notifyEligibleStudents(42L));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("One failed delivery does not stop the rest")
    void failureIsolated() {
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(openJob()));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(
                student("Asha Rao", "bad@example.com", "9"),
                student("Meena S", "meena@example.com", "9")));
        doThrow(new MailSendException("rejected")).when(mailSender)
                .send(org.mockito.ArgumentMatchers.<SimpleMailMessage>argThat(m -> m.getTo()[0].equals("bad@example.com")));

        assertEquals(1, service(true, "placement@gces.edu").notifyEligibleStudents(42L));
        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Line breaks in the role cannot inject extra mail headers")
    void subjectIsSingleLine() {
        Job job = openJob();
        job.setJobRole("SDE\r\nBcc: attacker@example.com");
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(job));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of(student("Asha", "asha@example.com", "9")));

        service(true, "placement@gces.edu").notifyEligibleStudents(42L);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertFalse(captor.getValue().getSubject().contains("\n"));
        assertFalse(captor.getValue().getSubject().contains("\r"));
    }

    @Test
    @DisplayName("Placed and blocked students are excluded from the candidate query")
    void queriesOnlyAlertableStatuses() {
        when(jobRepository.findWithDetailsByIdAndIsDeletedFalse(42L)).thenReturn(Optional.of(openJob()));
        when(studentRepository.findNotifiableStudents(any())).thenReturn(List.of());

        service(true, "placement@gces.edu").notifyEligibleStudents(42L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<PlacementStatus>> captor = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(studentRepository).findNotifiableStudents(captor.capture());
        assertTrue(captor.getValue().containsAll(List.of(PlacementStatus.PENDING, PlacementStatus.ACTIVE)));
        assertFalse(captor.getValue().contains(PlacementStatus.PLACED));
        assertFalse(captor.getValue().contains(PlacementStatus.BLOCKED));
    }
}
