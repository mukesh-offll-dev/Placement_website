package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.LoginRequestDTO;
import com.gces.placementcell.dto.response.LoginResponseDTO;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!user.isAccountActive()) {
            throw new org.springframework.security.access.AccessDeniedException("Account is not active or has been suspended");
        }

        if (request.getExpectedRole() != null && !request.getExpectedRole().isBlank()) {
            String expected = request.getExpectedRole().trim().toUpperCase();
            if (!user.getRole().name().equals(expected)) {
                throw new org.springframework.security.access.AccessDeniedException("Unauthorized role for this login portal");
            }
        }

        userRepository.updateLastLoginAt(user.getId(), LocalDateTime.now());

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return LoginResponseDTO.builder()
                .token(token)
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(resolveFullName(user))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResponseDTO getCurrentUser(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return LoginResponseDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(resolveFullName(user))
                .build();
    }

    private String resolveFullName(User user) {
        if (user.getStudentProfile() != null && user.getStudentProfile().getFullName() != null) {
            return user.getStudentProfile().getFullName();
        }
        if (user.getAdminProfile() != null && user.getAdminProfile().getName() != null) {
            return user.getAdminProfile().getName();
        }
        return user.getEmail().split("@")[0];
    }
}
