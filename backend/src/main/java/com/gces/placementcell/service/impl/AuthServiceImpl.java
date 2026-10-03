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
import com.gces.placementcell.security.JwtService;
import com.gces.placementcell.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Authentication service implementation.
 *
 * Reuses existing User / StudentProfile / AdminProfile entities.
 * BCrypt password hashing via PasswordEncoder and JWT generation via JwtService.
 * Enforces role verification and account status checks.
 */
@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthServiceImpl(UserRepository userRepository,
                           StudentProfileRepository studentProfileRepository,
                           AdminProfileRepository adminProfileRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.adminProfileRepository = adminProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    // ─────────────────────────────────────────────
    // Student Registration
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse registerStudent(RegisterRequest request) {
        validateUniqueEmail(request.email());

        if (request.rollNo() != null && !request.rollNo().isBlank()
                && studentProfileRepository.existsByRollNo(request.rollNo())) {
            throw new BadRequestException("Roll number already registered: " + request.rollNo());
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(false)
                .isDeleted(false)
                .build();
        user = userRepository.save(user);

        StudentProfile profile = StudentProfile.builder()
                .user(user)
                .email(request.email())
                .fullName(request.fullName())
                .rollNo(request.rollNo())
                .build();
        studentProfileRepository.save(profile);

        log.info("Student registered: {}", request.email());

        String token = jwtService.generateTokenWithRole(toSpringUser(user), user.getRole().name());
        return buildAuthResponse(token, user, request.fullName());
    }

    // ─────────────────────────────────────────────
    // Admin Registration
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse registerAdmin(RegisterRequest request) {
        validateUniqueEmail(request.email());

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(false)
                .isDeleted(false)
                .build();
        user = userRepository.save(user);

        AdminProfile profile = AdminProfile.builder()
                .user(user)
                .name(request.fullName())
                .designation("Administrator")
                .build();
        adminProfileRepository.save(profile);

        log.info("Admin registered: {}", request.email());

        String token = jwtService.generateTokenWithRole(toSpringUser(user), user.getRole().name());
        return buildAuthResponse(token, user, request.fullName());
    }

    // ─────────────────────────────────────────────
    // Login (STUDENT + ADMIN)
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Invalid email or password");
        } catch (org.springframework.security.authentication.LockedException | org.springframework.security.authentication.DisabledException ex) {
            throw new AccessDeniedException("Account is not active or has been suspended");
        }

        User user = userRepository.findByEmailAndIsDeletedFalse(request.email())
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (!user.isAccountActive()) {
            throw new AccessDeniedException("Account is not active or has been suspended");
        }

        if (request.expectedRole() != null && !request.expectedRole().isBlank()) {
            String expected = request.expectedRole().trim().toUpperCase();
            if (!user.getRole().name().equals(expected)) {
                throw new AccessDeniedException("Unauthorized role for this login portal");
            }
        }

        userRepository.updateLastLoginAt(user.getId(), LocalDateTime.now());

        String displayName = resolveDisplayName(user);
        String token = jwtService.generateTokenWithRole(toSpringUser(user), user.getRole().name());
        log.info("User logged in: {} (role={})", user.getEmail(), user.getRole());

        return buildAuthResponse(token, user, displayName);
    }

    // ─────────────────────────────────────────────
    // Current User
    // ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return UserResponse.from(user);
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private void validateUniqueEmail(String email) {
        if (userRepository.existsByEmailAndIsDeletedFalse(email)) {
            throw new BadRequestException("Email is already registered: " + email);
        }
    }

    private String resolveDisplayName(User user) {
        if (user.isStudent()) {
            return studentProfileRepository.findByUserId(user.getId())
                    .map(StudentProfile::getFullName)
                    .orElse(null);
        }
        if (user.isAdmin()) {
            return adminProfileRepository.findByUserId(user.getId())
                    .map(AdminProfile::getName)
                    .orElse(null);
        }
        return null;
    }

    private UserDetails toSpringUser(User user) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities("ROLE_" + user.getRole().name())
                .build();
    }

    private AuthResponse buildAuthResponse(String token, User user, String displayName) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(displayName)
                .build();
    }
}
