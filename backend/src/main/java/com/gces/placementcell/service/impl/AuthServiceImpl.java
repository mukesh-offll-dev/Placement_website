package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.request.RegisterRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.entity.AdminProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.JwtService;
import com.gces.placementcell.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * <p>Design decisions:</p>
 * <ul>
 *   <li>Reuses existing User / StudentProfile / AdminProfile entities — no new tables.</li>
 *   <li>BCrypt password hashing via the injected {@link PasswordEncoder}.</li>
 *   <li>Students get ACTIVE status immediately after registration.</li>
 *   <li>Admin registration is guarded: the endpoint itself is secured at the
 *       controller level (ADMIN role required) so only an existing admin can
 *       create another admin, except for the initial bootstrap admin which is
 *       explained in the README / seed SQL.</li>
 * </ul>
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

        // Roll-number uniqueness check (optional field for students)
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
    // Login (STUDENT + ADMIN share same endpoint)
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (BadCredentialsException ex) {
            throw new BadRequestException("Invalid email or password");
        }

        User user = userRepository.findByEmailAndIsDeletedFalse(request.email())
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadRequestException("Account is inactive. Please contact support.");
        }
        if (AccountStatus.SUSPENDED.equals(user.getAccountStatus())) {
            throw new BadRequestException("Account has been suspended. Please contact support.");
        }

        // Update last login timestamp
        userRepository.updateLastLoginAt(user.getId(), LocalDateTime.now());

        // Resolve display name from profile
        String displayName = resolveDisplayName(user);

        String token = jwtService.generateTokenWithRole(toSpringUser(user), user.getRole().name());
        log.info("User logged in: {} (role={})", user.getEmail(), user.getRole());
        return buildAuthResponse(token, user, displayName);
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

    /** Converts our User entity to a Spring Security UserDetails object for JWT generation. */
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
