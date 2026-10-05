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
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;

    @Override
    @Transactional
    public AuthResponse registerStudent(RegisterRequest request) {
        validateUniqueEmail(request.email());

        if (request.rollNo() != null && !request.rollNo().isBlank()
                && studentProfileRepository.existsByRollNo(request.rollNo())) {
            throw new BadRequestException("Roll number already registered: " + request.rollNo());
        }

        User user = userRepository.save(newUser(request, UserRole.STUDENT));

        studentProfileRepository.save(StudentProfile.builder()
                .user(user)
                .email(user.getEmail())
                .fullName(request.fullName())
                .rollNo(blankToNull(request.rollNo()))
                .build());

        log.info("Student registered: {}", user.getEmail());
        return buildAuthResponse(user, request.fullName(), "Student registered successfully");
    }

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
        String email = request.email().trim();

        // One message for unknown email and wrong password, so the response does not
        // reveal which accounts exist.
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive()) || !user.isAccountActive()) {
            throw new AccessDeniedException("Account is inactive. Please contact administrator.");
        }

        // The student and admin portals each pass the role they serve, so a student
        // cannot sign in through the admin page and vice versa.
        if (request.expectedRole() != null && !request.expectedRole().isBlank()
                && !user.getRole().name().equals(request.expectedRole().trim().toUpperCase(Locale.ROOT))) {
            throw new AccessDeniedException("Unauthorized role for this login portal");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User logged in: {} (role={})", user.getEmail(), user.getRole());
        return buildAuthResponse(user, resolveDisplayName(user), "Login successful");
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

    private AuthResponse buildAuthResponse(User user, String displayName, String message) {
        return AuthResponse.builder()
                .token(tokenProvider.generateToken(user))
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(displayName)
                .name(displayName)
                .role(user.getRole())
                .message(message)
                .build();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
