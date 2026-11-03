package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.LoginAttemptLimiter;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AuthService;
import com.gces.placementcell.service.StudentIdentity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final LoginAttemptLimiter loginAttemptLimiter;

    @Override
    @Transactional
    public AuthResponse registerAdmin(RegisterRequest request) {
        validateUniqueEmail(request.email());

        User user = userRepository.save(newUser(request, UserRole.ADMIN));

        adminProfileRepository.save(AdminProfile.builder()
                .user(user)
                .name(request.fullName())
                .designation("Administrator")
                .build());

        log.info("Admin registered: {}", user.getEmail());
        return buildAuthResponse(user, request.fullName(), "Admin registered successfully");
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String registerNumber = StudentIdentity.normalize(request.registerNumber());
        boolean byRegisterNumber = registerNumber != null && !registerNumber.isEmpty();
        String email = request.email() == null ? "" : request.email().trim();
        if (!byRegisterNumber && email.isEmpty()) {
            throw new BadRequestException("Register number or email is required");
        }
        String identifier = byRegisterNumber ? "rn:" + registerNumber : "em:" + email.toLowerCase(Locale.ROOT);

        // The initial password is the register number, which is not secret, so guessing
        // is throttled per account before any password is checked.
        long lockedMinutes = loginAttemptLimiter.minutesLockedFor(identifier);
        if (lockedMinutes > 0) {
            throw new AccessDeniedException(
                    "Too many failed sign-in attempts. Try again in " + lockedMinutes + " minute(s).");
        }

        // One message for unknown account and wrong password, so the response does not
        // reveal which accounts exist.
        Optional<User> candidate = byRegisterNumber
                ? studentProfileRepository.findByRollNo(registerNumber)
                        .map(StudentProfile::getUser)
                        .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
                : userRepository.findByEmailAndIsDeletedFalse(email);
        User user = candidate
                .filter(u -> passwordMatches(u, request.password(), byRegisterNumber ? registerNumber : null))
                .orElse(null);
        if (user == null) {
            loginAttemptLimiter.recordFailure(identifier);
            throw new BadCredentialsException(byRegisterNumber
                    ? "Invalid register number or password" : "Invalid email or password");
        }

        // Students are identified by register number only. Checked after the password so this
        // message cannot be used to discover which emails belong to students.
        if (!byRegisterNumber && user.isStudent()) {
            throw new AccessDeniedException("Students sign in with their register number, not an email.");
        }

        if (!Boolean.TRUE.equals(user.getIsActive()) || !user.isAccountActive()) {
            throw new AccessDeniedException("Account is inactive. Please contact administrator.");
        }

        // The student and admin portals each pass the role they serve, so a student
        // cannot sign in through the admin page and vice versa.
        if (request.expectedRole() != null && !request.expectedRole().isBlank()
                && !user.getRole().name().equals(request.expectedRole().trim().toUpperCase(Locale.ROOT))) {
            throw new AccessDeniedException("Unauthorized role for this login portal");
        }

        loginAttemptLimiter.recordSuccess(identifier);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User logged in: id={} role={}", user.getId(), user.getRole());
        return buildLoginResponse(user, "Login successful");
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return UserResponse.from(user);
    }

    private User newUser(RegisterRequest request, UserRole role) {
        return User.builder()
                .email(request.email().trim().toLowerCase(Locale.ROOT))
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(false)
                .isDeleted(false)
                .build();
    }

    private void validateUniqueEmail(String email) {
        if (userRepository.existsByEmailAndIsDeletedFalse(email.trim().toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Email is already registered: " + email);
        }
    }

    private String resolveDisplayName(User user) {
        if (UserRole.STUDENT.equals(user.getRole())) {
            return studentProfileRepository.findByUserId(user.getId())
                    .map(StudentProfile::getFullName)
                    .orElse(user.getEmail());
        }
        String profileName = adminProfileRepository.findByUserId(user.getId())
                .map(AdminProfile::getName)
                .orElse(null);
        if (profileName != null && !profileName.isBlank()) {
            return profileName;
        }
        return UserRole.PLACEMENT_OFFICER.equals(user.getRole()) ? "Placement Officer" : "Administrator";
    }

    /**
     * A normal password check, with one allowance: until a student replaces their initial password
     * (their register number, stored uppercase) it is accepted in any letter case, because students
     * naturally type "cs2022001" for "CS2022001". Once they set their own password it is exact.
     */
    private boolean passwordMatches(User user, String rawPassword, String registerNumber) {
        if (passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            return true;
        }
        return registerNumber != null
                && Boolean.TRUE.equals(user.getMustChangePassword())
                && rawPassword.trim().equalsIgnoreCase(registerNumber)
                && passwordEncoder.matches(registerNumber, user.getPasswordHash());
    }

    private AuthResponse buildAuthResponse(User user, String displayName, String message) {
        return AuthResponse.builder()
                .token(tokenProvider.generateToken(user))
                .userId(user.getId())
                .email(StudentIdentity.visibleEmail(user.getEmail()))
                .fullName(displayName)
                .name(displayName)
                .role(user.getRole())
                .message(message)
                .setupRequired(Boolean.TRUE.equals(user.getMustChangePassword()))
                .build();
    }

    /** Login response, including whether the student still has to do the first-login setup. */
    private AuthResponse buildLoginResponse(User user, String message) {
        AuthResponse response = buildAuthResponse(user, resolveDisplayName(user), message);
        if (user.isStudent()) {
            boolean setupPending = studentProfileRepository.findByUserId(user.getId())
                    .map(profile -> !Boolean.TRUE.equals(profile.getProfileSetupCompleted()))
                    .orElse(false);
            response.setSetupRequired(setupPending || response.isSetupRequired());
        }
        return response;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
