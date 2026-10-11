package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.AdminLoginRequest;
import com.gces.placementcell.dto.response.AuthResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;

    @Override
    @Transactional
    public AuthResponse login(AdminLoginRequest request) {
        String identifier = request.getUsername().trim();

        User user = userRepository.findByEmailAndIsDeletedFalse(identifier)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new org.springframework.security.access.AccessDeniedException("Account is inactive. Please contact administrator.");
        }

        if (request.getExpectedRole() != null && !request.getExpectedRole().isBlank()) {
            if (!user.getRole().name().equalsIgnoreCase(request.getExpectedRole().trim())) {
                throw new org.springframework.security.access.AccessDeniedException("Role not authorized for this portal");
            }
        }

        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash())
                || request.getPassword().equals(user.getPasswordHash());

        if (!passwordMatches) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid email or password");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = tokenProvider.generateToken(user);

        String displayName = user.getEmail();
        if (UserRole.STUDENT.equals(user.getRole())) {
            displayName = studentProfileRepository.findByUserId(user.getId())
                    .map(StudentProfile::getFullName)
                    .orElse(user.getEmail());
        } else if (UserRole.ADMIN.equals(user.getRole())) {
            displayName = "Administrator";
        } else if (UserRole.PLACEMENT_OFFICER.equals(user.getRole())) {
            displayName = "Placement Officer";
        }

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .name(displayName)
                .role(user.getRole())
                .message("Login successful")
                .build();
    }

    @Override
    @Transactional
    public AuthResponse registerStudent(com.gces.placementcell.dto.request.RegisterRequest request) {
        if (userRepository.findByEmailAndIsDeletedFalse(request.email()).isPresent()) {
            throw new BadRequestException("Email already registered: " + request.email());
        }

        User user = User.builder()
                .email(request.email().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(com.gces.placementcell.entity.enums.UserRole.STUDENT)
                .accountStatus(com.gces.placementcell.entity.enums.AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        user = userRepository.save(user);

        StudentProfile profile = StudentProfile.builder()
                .user(user)
                .fullName(request.fullName().trim())
                .email(request.email().trim())
                .rollNo(request.rollNo())
                .placementStatus(com.gces.placementcell.entity.enums.PlacementStatus.PENDING)
                .isOpenToOpportunities(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        studentProfileRepository.save(profile);

        String token = tokenProvider.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .name(profile.getFullName())
                .role(user.getRole())
                .message("Student registered successfully")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.gces.placementcell.dto.response.UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new com.gces.placementcell.exception.ResourceNotFoundException("User not found with email: " + email));
        return com.gces.placementcell.dto.response.UserResponse.from(user);
    }
}
