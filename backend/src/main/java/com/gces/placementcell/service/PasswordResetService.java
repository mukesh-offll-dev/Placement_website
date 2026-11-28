package com.gces.placementcell.service;

import com.gces.placementcell.entity.PasswordResetToken;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.repository.PasswordResetTokenRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.LoginAttemptLimiter;
import com.gces.placementcell.security.TokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * "Forgot password": emails a single-use link to the address on the account, and sets a new
 * password when that link is used. Works for every role (student, faculty advisor, placement
 * officer, admin).
 *
 * Rules that keep it safe:
 * <ul>
 *   <li>The answer to a request is always the same, whether or not an account matches, and the
 *       email is sent asynchronously, so neither the text nor the timing reveals which accounts
 *       exist.</li>
 *   <li>Only the SHA-256 of the token is stored. The token is 32 random bytes, expires after
 *       {@code tokenMinutes} and works once; a newer link retires the older ones.</li>
 *   <li>At most {@code maxRequestsPerHour} links per account per hour; extra requests are
 *       ignored silently.</li>
 *   <li>Using a link replaces the password hash, which also signs out every older session
 *       (the JWT carries a password version).</li>
 * </ul>
 */
@Slf4j
@Service
public class PasswordResetService {

    /** One message for every unusable link (unknown, used, expired, account gone), so none can be told apart. */
    static final String INVALID_LINK = "This reset link is invalid or has expired. Request a new one.";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final LoginAttemptLimiter loginAttemptLimiter;
    private final AuditService auditService;
    private final UserDisplayNames displayNames;
    private final PasswordResetMailer resetMailer;
    private final TransactionTemplate transactionTemplate;
    private final long tokenMinutes;
    private final int maxRequestsPerHour;

    public PasswordResetService(UserRepository userRepository,
                                StudentProfileRepository studentProfileRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder,
                                TokenProvider tokenProvider,
                                LoginAttemptLimiter loginAttemptLimiter,
                                AuditService auditService,
                                UserDisplayNames displayNames,
                                PasswordResetMailer resetMailer,
                                TransactionTemplate transactionTemplate,
                                @Value("${app.password-reset.token-minutes:30}") long tokenMinutes,
                                @Value("${app.password-reset.max-requests-per-hour:3}") int maxRequestsPerHour) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.loginAttemptLimiter = loginAttemptLimiter;
        this.auditService = auditService;
        this.displayNames = displayNames;
        this.resetMailer = resetMailer;
        this.transactionTemplate = transactionTemplate;
        this.tokenMinutes = Math.max(1, tokenMinutes);
        this.maxRequestsPerHour = Math.max(1, maxRequestsPerHour);
    }

    /** Where a reset link goes, and who it is for. */
    private record Target(User user, StudentProfile profile, String deliveryEmail) {
    }

    /** A link that was just created, to be mailed once the transaction has committed. */
    private record Issued(String deliveryEmail, String name, String rawToken) {
    }

    /**
     * Starts a reset for an email address or a student register number. Returns nothing and never
     * throws for an unknown, inactive, un-emailable or throttled account.
     */
    public void requestReset(String identifier) {
        String cleaned = identifier == null ? "" : identifier.trim();
        if (cleaned.isEmpty()) {
            return;
        }
        Issued issued = transactionTemplate.execute(status -> issueToken(cleaned));
        if (issued != null) {
            // Outside the transaction: the row must be committed before the link can be used,
            // and the mail call must not hold the request.
            resetMailer.sendResetEmail(issued.deliveryEmail(), issued.name(), issued.rawToken());
        }
    }

    private Issued issueToken(String identifier) {
        Optional<Target> found = resolve(identifier);
        if (found.isEmpty()) {
            return null;
        }
        Target target = found.get();
        User user = target.user();
        LocalDateTime now = LocalDateTime.now();

        if (tokenRepository.countByUserIdAndCreatedAtAfter(user.getId(), now.minusHours(1)) >= maxRequestsPerHour) {
            log.info("Password reset ignored for userId={}: hourly limit reached", user.getId());
            return null;
        }

        retireOpenTokens(user.getId(), now);
        String raw = newToken();
        tokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .expiresAt(now.plusMinutes(tokenMinutes))
                .build());
        log.info("Password reset link issued: userId={} role={}", user.getId(), user.getRole());
        return new Issued(target.deliveryEmail(), displayNames.nameOf(user), raw);
    }

    /** Retires every link of this user that is still open, so only the newest one works. */
    private void retireOpenTokens(Long userId, LocalDateTime now) {
        for (PasswordResetToken open : tokenRepository.findByUserIdAndUsedAtIsNull(userId)) {
            open.setUsedAt(now);
        }
    }

    /** The account an identifier names, only when it can actually be emailed. */
    private Optional<Target> resolve(String identifier) {
        User user;
        StudentProfile profile = null;
        if (identifier.contains("@")) {
            user = userRepository.findByEmailAndIsDeletedFalse(identifier.toLowerCase(Locale.ROOT)).orElse(null);
            if (user != null && user.isStudent()) {
                profile = studentProfileRepository.findByUserId(user.getId()).orElse(null);
            }
        } else {
            String registerNumber = StudentIdentity.normalize(identifier);
            profile = studentProfileRepository.findByRollNo(registerNumber).orElse(null);
            user = profile == null ? null : profile.getUser();
        }
        if (user == null || Boolean.TRUE.equals(user.getIsDeleted()) || !user.isAccountActive()) {
            return Optional.empty();
        }
        String email = deliverableEmail(profile, user);
        return email == null ? Optional.empty() : Optional.of(new Target(user, profile, email));
    }

    /**
     * The address to mail: a student's profile email first, then the login email. The stand-in
     * addresses the system makes up for students who have not signed in yet are never mailed.
     */
    private static String deliverableEmail(StudentProfile profile, User user) {
        if (profile != null && profile.getEmail() != null && !profile.getEmail().isBlank()
                && !StudentIdentity.isUndeliverableEmail(profile.getEmail())) {
            return profile.getEmail().trim();
        }
        return StudentIdentity.isUndeliverableEmail(user.getEmail()) ? null : user.getEmail();
    }

    /**
     * Sets the new password for the link's owner and returns their role (so the page can send them
     * to the right sign-in). Every failure to use the link gives the same message.
     */
    @Transactional
    public UserRole resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = rawToken == null || rawToken.isBlank() ? null
                : tokenRepository.findByTokenHash(hash(rawToken.trim())).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (token == null || !token.isUsable(now)) {
            throw new BadRequestException(INVALID_LINK);
        }
        User user = token.getUser();
        if (user == null || Boolean.TRUE.equals(user.getIsDeleted()) || !user.isAccountActive()) {
            throw new BadRequestException(INVALID_LINK);
        }

        // bcrypt only reads the first 72 bytes, so a longer password would be silently truncated.
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Password cannot be longer than 72 bytes");
        }
        StudentProfile profile = user.isStudent()
                ? studentProfileRepository.findByUserId(user.getId()).orElse(null) : null;
        if (profile != null && profile.getRollNo() != null && newPassword.equalsIgnoreCase(profile.getRollNo())) {
            throw new BadRequestException("Your password cannot be your register number");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("Choose a password different from your current one");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // Whoever was still on the initial or temporary password has now chosen their own.
        user.setMustChangePassword(false);
        userRepository.save(user);

        token.setUsedAt(now);
        tokenRepository.save(token);
        retireOpenTokens(user.getId(), now);

        tokenProvider.evictUser(user.getId(), user.getEmail());
        // A locked-out user who just proved they own the mailbox can sign in again.
        loginAttemptLimiter.recordSuccess("em:" + user.getEmail());
        if (profile != null && profile.getRollNo() != null) {
            loginAttemptLimiter.recordSuccess("rn:" + profile.getRollNo());
        }
        // Who and what only: never the token or the password.
        auditService.record(user, "PASSWORD_RESET", "USER", user.getId(), "Password reset with an emailed link");
        log.info("Password reset completed: userId={} role={}", user.getId(), user.getRole());
        return user.getRole();
    }

    /** Used and expired links have no value after a day. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeOldTokens() {
        int removed = tokenRepository.deleteExpiredBefore(LocalDateTime.now().minusDays(1));
        if (removed > 0) {
            log.info("Removed {} expired password reset links", removed);
        }
    }

    /** 32 random bytes, URL-safe without padding: 43 characters. */
    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Hex SHA-256: the only form of the token that is stored or looked up. */
    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
