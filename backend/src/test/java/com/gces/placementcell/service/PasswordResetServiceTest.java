package com.gces.placementcell.service;

import com.gces.placementcell.entity.PasswordResetToken;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.repository.PasswordResetTokenRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.LoginAttemptLimiter;
import com.gces.placementcell.security.TokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Forgot / reset password")
class PasswordResetServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private TokenProvider tokenProvider;
    @Mock private LoginAttemptLimiter loginAttemptLimiter;
    @Mock private AuditService auditService;
    @Mock private UserDisplayNames displayNames;
    @Mock private PasswordResetMailer resetMailer;
    @Mock private TransactionTemplate transactionTemplate;

    private PasswordResetService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        // Run the transaction callback inline instead of opening a real transaction.
        when(transactionTemplate.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
        when(displayNames.nameOf(any())).thenReturn("Asha");
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "enc:" + inv.getArgument(0));
        when(tokenRepository.countByUserIdAndCreatedAtAfter(anyLong(), any())).thenReturn(0L);
        service = new PasswordResetService(userRepository, studentProfileRepository, tokenRepository,
                passwordEncoder, tokenProvider, loginAttemptLimiter, auditService, displayNames, resetMailer,
                transactionTemplate, 30, 3);
    }

    private static User staff(String email) {
        return User.builder().id(7L).email(email).passwordHash("old-hash").role(UserRole.ADMIN)
                .accountStatus(AccountStatus.ACTIVE).isActive(true).isDeleted(false).mustChangePassword(true).build();
    }

    private static User studentUser(String loginEmail) {
        return User.builder().id(9L).email(loginEmail).passwordHash("old-hash").role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE).isActive(true).isDeleted(false).mustChangePassword(true).build();
    }

    private static StudentProfile profile(User user, String profileEmail) {
        return StudentProfile.builder().user(user).rollNo("830123104001").email(profileEmail).fullName("Asha").build();
    }

    private PasswordResetToken lastSavedToken() {
        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(captor.capture());
        return captor.getValue();
    }

    // ---------------------------------------------------------------- token primitives

    @Test
    @DisplayName("hash is a 64-character hex SHA-256 and the token is 43 URL-safe characters")
    void tokenAndHashShape() {
        String token = PasswordResetService.newToken();
        assertEquals(43, token.length());
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"));
        assertNotEquals(token, PasswordResetService.newToken());

        String hash = PasswordResetService.hash(token);
        assertEquals(64, hash.length());
        assertTrue(hash.matches("[0-9a-f]{64}"));
        assertEquals(hash, PasswordResetService.hash(token));
        // Known SHA-256 vector, so the algorithm cannot drift unnoticed.
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                PasswordResetService.hash("abc"));
    }

    // ---------------------------------------------------------------- requesting a link

    @Test
    @DisplayName("A staff email gets a link: only the token's hash is stored, the raw token is mailed")
    void staffRequestStoresHashAndMailsToken() {
        User admin = staff("officer@gces.edu");
        when(userRepository.findByEmailAndIsDeletedFalse("officer@gces.edu")).thenReturn(Optional.of(admin));

        service.requestReset("  Officer@GCES.edu ");

        PasswordResetToken saved = lastSavedToken();
        ArgumentCaptor<String> raw = ArgumentCaptor.forClass(String.class);
        verify(resetMailer).sendResetEmail(eq("officer@gces.edu"), eq("Asha"), raw.capture());
        assertEquals(PasswordResetService.hash(raw.getValue()), saved.getTokenHash());
        assertNotEquals(raw.getValue(), saved.getTokenHash());
        assertEquals(admin, saved.getUser());
        // Valid for 30 minutes, give or take the test's own runtime.
        LocalDateTime expected = LocalDateTime.now().plusMinutes(30);
        assertTrue(saved.getExpiresAt().isAfter(expected.minusMinutes(1)) && saved.getExpiresAt().isBefore(expected.plusMinutes(1)));
    }

    @Test
    @DisplayName("Requesting a new link retires the user's older open links")
    void newLinkRetiresOlderOnes() {
        User admin = staff("officer@gces.edu");
        when(userRepository.findByEmailAndIsDeletedFalse("officer@gces.edu")).thenReturn(Optional.of(admin));
        PasswordResetToken older = PasswordResetToken.builder().user(admin).tokenHash("h")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(tokenRepository.findByUserIdAndUsedAtIsNull(7L)).thenReturn(java.util.List.of(older));

        service.requestReset("officer@gces.edu");

        assertNotNull(older.getUsedAt());
    }

    @Test
    @DisplayName("A student can ask with a register number; the link goes to the email on the profile")
    void studentByRegisterNumber() {
        User user = studentUser("pending@pending.gces.local");
        StudentProfile profile = profile(user, "asha@example.com");
        when(studentProfileRepository.findByRollNo("830123104001")).thenReturn(Optional.of(profile));

        service.requestReset("830123104001");

        verify(resetMailer).sendResetEmail(eq("asha@example.com"), eq("Asha"), anyString());
        assertNotNull(lastSavedToken());
    }

    @Test
    @DisplayName("A student with no real email yet cannot self-reset: nothing is stored or sent")
    void studentWithoutEmailGetsNothing() {
        User user = studentUser("830123104001@pending.gces.local");
        when(studentProfileRepository.findByRollNo("830123104001"))
                .thenReturn(Optional.of(profile(user, "830123104001@pending.gces.local")));

        service.requestReset("830123104001");

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(resetMailer);
    }

    @Test
    @DisplayName("Generated faculty logins (*.gces.local) are never emailed")
    void generatedFacultyAddressIsSkipped() {
        User faculty = staff("cse.advisor@faculty.gces.local");
        when(userRepository.findByEmailAndIsDeletedFalse("cse.advisor@faculty.gces.local")).thenReturn(Optional.of(faculty));

        service.requestReset("cse.advisor@faculty.gces.local");

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(resetMailer);
    }

    @Test
    @DisplayName("An unknown identifier does nothing and does not throw (same response as a real one)")
    void unknownIdentifierIsSilent() {
        when(userRepository.findByEmailAndIsDeletedFalse(anyString())).thenReturn(Optional.empty());
        when(studentProfileRepository.findByRollNo(anyString())).thenReturn(Optional.empty());

        service.requestReset("nobody@example.com");
        service.requestReset("999999999999");
        service.requestReset("   ");
        service.requestReset(null);

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(resetMailer);
    }

    @Test
    @DisplayName("A disabled account gets no link")
    void inactiveAccountIsSkipped() {
        User admin = staff("officer@gces.edu");
        admin.setIsActive(false);
        when(userRepository.findByEmailAndIsDeletedFalse("officer@gces.edu")).thenReturn(Optional.of(admin));

        service.requestReset("officer@gces.edu");

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(resetMailer);
    }

    @Test
    @DisplayName("At most 3 links per account per hour: the 4th request is ignored silently")
    void hourlyLimit() {
        User admin = staff("officer@gces.edu");
        when(userRepository.findByEmailAndIsDeletedFalse("officer@gces.edu")).thenReturn(Optional.of(admin));
        when(tokenRepository.countByUserIdAndCreatedAtAfter(eq(7L), any())).thenReturn(3L);

        service.requestReset("officer@gces.edu");

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(resetMailer);
    }

    // ---------------------------------------------------------------- using a link

    private PasswordResetToken openToken(User user, String raw, LocalDateTime expiresAt, LocalDateTime usedAt) {
        PasswordResetToken token = PasswordResetToken.builder().user(user)
                .tokenHash(PasswordResetService.hash(raw)).expiresAt(expiresAt).usedAt(usedAt).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.hash(raw))).thenReturn(Optional.of(token));
        return token;
    }

    @Test
    @DisplayName("A valid link sets the new password, clears the forced-change flag, retires the link and signs old sessions out")
    void resetSucceeds() {
        User admin = staff("officer@gces.edu");
        PasswordResetToken token = openToken(admin, "good-token", LocalDateTime.now().plusMinutes(10), null);
        when(passwordEncoder.matches("NewPass123", "old-hash")).thenReturn(false);

        UserRole role = service.resetPassword("good-token", "NewPass123");

        assertEquals(UserRole.ADMIN, role);
        assertEquals("enc:NewPass123", admin.getPasswordHash());
        assertFalse(admin.getMustChangePassword());
        assertNotNull(token.getUsedAt());
        verify(userRepository).save(admin);
        verify(tokenProvider).evictUser(7L, "officer@gces.edu");
        verify(loginAttemptLimiter).recordSuccess("em:officer@gces.edu");
        // The audit row names the action, never the token or the password.
        ArgumentCaptor<String> details = ArgumentCaptor.forClass(String.class);
        verify(auditService).record(eq(admin), eq("PASSWORD_RESET"), eq("USER"), eq(7L), details.capture());
        assertFalse(details.getValue().contains("good-token") || details.getValue().contains("NewPass123"));
    }

    @Test
    @DisplayName("A used link cannot be used again")
    void singleUse() {
        User admin = staff("officer@gces.edu");
        openToken(admin, "used-token", LocalDateTime.now().plusMinutes(10), LocalDateTime.now().minusMinutes(1));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.resetPassword("used-token", "NewPass123"));

        assertEquals(PasswordResetService.INVALID_LINK, ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("An expired link is refused with the same message as an unknown one")
    void expiredAndUnknownLookTheSame() {
        User admin = staff("officer@gces.edu");
        openToken(admin, "old-token", LocalDateTime.now().minusSeconds(1), null);
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("never-issued"))).thenReturn(Optional.empty());

        BadRequestException expired = assertThrows(BadRequestException.class,
                () -> service.resetPassword("old-token", "NewPass123"));
        BadRequestException unknown = assertThrows(BadRequestException.class,
                () -> service.resetPassword("never-issued", "NewPass123"));
        BadRequestException blank = assertThrows(BadRequestException.class,
                () -> service.resetPassword("  ", "NewPass123"));

        assertEquals(PasswordResetService.INVALID_LINK, expired.getMessage());
        assertEquals(expired.getMessage(), unknown.getMessage());
        assertEquals(expired.getMessage(), blank.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("A link of a deleted or disabled account is refused")
    void inactiveOwnerRefused() {
        User admin = staff("officer@gces.edu");
        admin.setIsActive(false);
        openToken(admin, "t", LocalDateTime.now().plusMinutes(10), null);

        assertThrows(BadRequestException.class, () -> service.resetPassword("t", "NewPass123"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("A student cannot choose their register number, or their current password, or more than 72 bytes")
    void passwordRules() {
        User user = studentUser("asha@example.com");
        when(studentProfileRepository.findByUserId(9L)).thenReturn(Optional.of(profile(user, "asha@example.com")));
        openToken(user, "t", LocalDateTime.now().plusMinutes(10), null);
        when(passwordEncoder.matches("SamePass123", "old-hash")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> service.resetPassword("t", "830123104001"));
        assertThrows(BadRequestException.class, () -> service.resetPassword("t", "SamePass123"));
        // 40 three-byte characters = 120 bytes, under the DTO's 72-character limit but over bcrypt's 72 bytes.
        assertThrows(BadRequestException.class, () -> service.resetPassword("t", "Aa1" + "€".repeat(40)));

        verify(userRepository, never()).save(any());
        assertTrue(user.getMustChangePassword(), "a refused reset changes nothing");
    }

    @Test
    @DisplayName("A student's lockout (register number) is cleared once they reset")
    void studentLockoutCleared() {
        User user = studentUser("asha@example.com");
        when(studentProfileRepository.findByUserId(9L)).thenReturn(Optional.of(profile(user, "asha@example.com")));
        openToken(user, "t", LocalDateTime.now().plusMinutes(10), null);

        service.resetPassword("t", "BrandNew123");

        verify(loginAttemptLimiter).recordSuccess("rn:830123104001");
        verify(loginAttemptLimiter).recordSuccess("em:asha@example.com");
    }
}
