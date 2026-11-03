package com.gces.placementcell.security;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TokenProvider user lookup cache")
class TokenProviderCacheTest {

    private static final String SECRET = "a-test-secret-that-is-comfortably-longer-than-thirty-two-bytes";

    @Mock private UserRepository userRepository;

    private TokenProvider tokenProvider;
    private User user;

    @BeforeEach
    void setUp() {
        tokenProvider = new TokenProvider(SECRET, 3_600_000L, userRepository);
        user = User.builder().id(5L).email("asha@example.com").role(UserRole.STUDENT).isActive(true).build();
    }

    @Test
    @DisplayName("Repeated requests with the same token hit the database once")
    void reusesLookup() {
        when(userRepository.findByIdAndIsDeletedFalse(5L)).thenReturn(Optional.of(user));
        String token = tokenProvider.generateToken(user);

        for (int i = 0; i < 5; i++) {
            assertTrue(tokenProvider.validateTokenAndGetUser(token).isPresent());
        }

        verify(userRepository, times(1)).findByIdAndIsDeletedFalse(5L);
    }

    @Test
    @DisplayName("A tampered token is rejected even when the user is cached")
    void signatureStillChecked() {
        when(userRepository.findByIdAndIsDeletedFalse(5L)).thenReturn(Optional.of(user));
        String token = tokenProvider.generateToken(user);
        assertTrue(tokenProvider.validateTokenAndGetUser(token).isPresent());

        String tampered = token.substring(0, token.length() - 3) + "abc";

        assertFalse(tokenProvider.validateTokenAndGetUser(tampered).isPresent());
    }

    @Test
    @DisplayName("A missing user is not cached, so a later valid user is found immediately")
    void missesAreNotCached() {
        when(userRepository.findByIdAndIsDeletedFalse(5L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(user));
        String token = tokenProvider.generateToken(user);

        assertFalse(tokenProvider.validateTokenAndGetUser(token).isPresent());
        assertEquals("asha@example.com", tokenProvider.validateTokenAndGetUser(token).orElseThrow().getEmail());
        verify(userRepository, times(2)).findByIdAndIsDeletedFalse(5L);
    }
}
