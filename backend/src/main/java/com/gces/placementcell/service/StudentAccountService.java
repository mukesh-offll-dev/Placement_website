package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.ChangePasswordRequest;
import com.gces.placementcell.dto.request.StudentSetupRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.CustomUserDetailsService;
import com.gces.placementcell.security.TokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * A student's own account: the mandatory first-login setup and later password changes.
 *
 * Both return a fresh token. The first-login setup changes the account's email (from the
 * stand-in address to the student's real one), and tokens are issued for an email, so the old
 * token stops matching the account.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentAccountService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Replaces the initial password and fills in name, email and phone. Only available while setup
     * is still pending, so it cannot be used to change a password without the current one later.
     */
    @Transactional
    public AuthResponse completeFirstLogin(String currentEmail, StudentSetupRequest request) {
        User user = findUser(currentEmail);
        StudentProfile profile = findProfile(user);

        boolean setupPending = Boolean.TRUE.equals(user.getMustChangePassword())
                || !Boolean.TRUE.equals(profile.getProfileSetupCompleted());
        if (!setupPending) {
            throw new BadRequestException("Your account is already set up. Use 'change password' instead.");
        }

        requireAcceptableNewPassword(user, profile, request.newPassword());

        String newEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (StudentIdentity.isPlaceholderEmail(newEmail)) {
            throw new BadRequestException("Enter your own email address");
        }
        userRepository.findByEmail(newEmail)
                .filter(other -> !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new BadRequestException("That email address is already in use");
                });

        String oldEmail = user.getEmail();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        user.setEmail(newEmail);
        userRepository.save(user);

        profile.setFullName(request.fullName().trim());
        profile.setEmail(newEmail);
        profile.setPhone(request.phone().trim());
        profile.setProfileSetupCompleted(true);
        profile.setProfileCompletionPercent(completionPercent(profile));
        studentProfileRepository.save(profile);

        forgetCachedUser(user, oldEmail);
        log.info("Student completed first-login setup: userId={}", user.getId());
        return respond(user, profile, "Profile set up successfully");
    }

    @Transactional
    public AuthResponse changePassword(String email, ChangePasswordRequest request) {
        User user = findUser(email);
        StudentProfile profile = findProfile(user);

        // A 400, not a 401: the client treats 401 as "session expired" and signs the user out.
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        requireAcceptableNewPassword(user, profile, request.newPassword());

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        forgetCachedUser(user, user.getEmail());
        log.info("Student changed password: userId={}", user.getId());
        return respond(user, profile, "Password changed successfully");
    }

    private void requireAcceptableNewPassword(User user, StudentProfile profile, String newPassword) {
        // bcrypt only reads the first 72 bytes, so a longer password would be silently truncated.
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Password cannot be longer than 72 bytes");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("Choose a password different from your current one");
        }
        if (profile.getRollNo() != null && newPassword.equalsIgnoreCase(profile.getRollNo())) {
            throw new BadRequestException("Your password cannot be your register number");
        }
    }

    /** Enough of the profile filled in to count as complete: the fields a placement cell needs. */
    static short completionPercent(StudentProfile profile) {
        boolean[] filled = {
                notBlank(profile.getFullName()) && !profile.getFullName().equalsIgnoreCase(profile.getRollNo()),
                notBlank(profile.getEmail()) && !StudentIdentity.isPlaceholderEmail(profile.getEmail()),
                notBlank(profile.getPhone()),
                notBlank(profile.getDepartment()),
                notBlank(profile.getBatch()),
                profile.getCgpa() != null,
                notBlank(profile.getResumeUrl()),
        };
        int done = 0;
        for (boolean f : filled) {
            if (f) {
                done++;
            }
        }
        return (short) Math.round(done * 100f / filled.length);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private void forgetCachedUser(User user, String oldEmail) {
        userDetailsService.evict(oldEmail);
        userDetailsService.evict(user.getEmail());
        tokenProvider.evictUser(user.getId(), oldEmail);
        tokenProvider.evictUser(user.getId(), user.getEmail());
    }

    private AuthResponse respond(User user, StudentProfile profile, String message) {
        return AuthResponse.builder()
                .token(tokenProvider.generateToken(user))
                .userId(user.getId())
                .email(StudentIdentity.visibleEmail(user.getEmail()))
                .fullName(profile.getFullName())
                .name(profile.getFullName())
                .role(user.getRole())
                .message(message)
                .setupRequired(false)
                .build();
    }

    private User findUser(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private StudentProfile findProfile(User user) {
        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }
}
