package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.response.UserResponse;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.AdminProfileRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenProvider;
import com.gces.placementcell.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
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
    private TokenProvider tokenProvider;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository,
                studentProfileRepository,
                adminProfileRepository,
                passwordEncoder,
                tokenProvider
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

    @Test
    @DisplayName("login throws BadCredentialsException when email is not registered")
    void testLoginUnknownEmailThrowsException() {
        String email = "unknown@gces.edu";
        LoginRequest request = new LoginRequest(email, "AnyPassword123");
        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.empty());

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
                () -> authService.login(request));
        assertEquals("Invalid email or password", ex.getMessage());
        verify(userRepository).findByEmailAndIsDeletedFalse(email);
    }

    @Test
    @DisplayName("login throws BadCredentialsException when password does not match")
    void testLoginIncorrectPasswordThrowsException() {
        String email = "student@gces.edu";
        LoginRequest request = new LoginRequest(email, "WrongPassword");
        User user = User.builder()
                .id(1L)
                .email(email)
                .passwordHash("$2a$10$realHashedPassword")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .build();

        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "$2a$10$realHashedPassword")).thenReturn(false);

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
                () -> authService.login(request));
        assertEquals("Invalid email or password", ex.getMessage());
        verify(userRepository).findByEmailAndIsDeletedFalse(email);
        verify(passwordEncoder).matches("WrongPassword", "$2a$10$realHashedPassword");
    }

    @Test
    @DisplayName("login throws AccessDeniedException when account is inactive")
    void testLoginInactiveAccountThrowsException() {
        String email = "inactive@gces.edu";
        LoginRequest request = new LoginRequest(email, "Password123");
        User user = User.builder()
                .id(2L)
                .email(email)
                .passwordHash("$2a$10$realHashedPassword")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.PENDING)
                .isActive(false)
                .isDeleted(false)
                .build();

        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "$2a$10$realHashedPassword")).thenReturn(true);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> authService.login(request));
        assertEquals("Account is inactive. Please contact administrator.", ex.getMessage());
    }

    @Test
    @DisplayName("login throws AccessDeniedException when expected role does not match")
    void testLoginRoleMismatchThrowsException() {
        String email = "student@gces.edu";
        LoginRequest request = new LoginRequest(email, "Password123", "ADMIN");
        User user = User.builder()
                .id(1L)
                .email(email)
                .passwordHash("$2a$10$realHashedPassword")
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .build();

        when(userRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "$2a$10$realHashedPassword")).thenReturn(true);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> authService.login(request));
        assertEquals("Unauthorized role for this login portal", ex.getMessage());
    }
}
