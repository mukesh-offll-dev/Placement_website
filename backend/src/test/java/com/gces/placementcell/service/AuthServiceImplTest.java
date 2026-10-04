package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.JwtService;
import com.gces.placementcell.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthServiceImpl Unit Tests")
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private AdminProfileRepository adminProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository,
                studentProfileRepository,
                adminProfileRepository,
                passwordEncoder,
                jwtService,
                authenticationManager
        );
    }

    @Test
    @DisplayName("getCurrentUser returns UserResponse when user exists")
    void testGetCurrentUserSuccess() {
        String email = "student@gces.edu";
        User user = User.builder()
                .id(1L)
                .email(email)
                .passwordHash("$2a$10$hashedpassword")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isEmailVerified(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .isDeleted(false)
                .build();

        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.of(user));

        UserResponse response = authService.getCurrentUser(email);

        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals(email, response.email());
        assertEquals(UserRole.STUDENT, response.role());
        assertEquals(AccountStatus.ACTIVE, response.accountStatus());
        assertEquals(true, response.isActive());
        assertEquals(true, response.isEmailVerified());
        verify(userRepository).findByEmailAndIsDeletedFalse(email);
    }

    @Test
    @DisplayName("getCurrentUser throws ResourceNotFoundException when user does not exist")
    void testGetCurrentUserNotFoundThrowsException() {
        String email = "unknown@gces.edu";
        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> authService.getCurrentUser(email));
        verify(userRepository).findByEmailAndIsDeletedFalse(email);
    }
}
