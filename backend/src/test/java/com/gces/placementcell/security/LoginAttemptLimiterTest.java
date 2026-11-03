package com.gces.placementcell.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Login attempt limiter")
class LoginAttemptLimiterTest {

    @Test
    @DisplayName("Locks an account after the configured number of failures")
    void locksAfterFailures() {
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(3, 15);

        limiter.recordFailure("rn:ABC12345");
        limiter.recordFailure("rn:ABC12345");
        assertEquals(0, limiter.minutesLockedFor("rn:ABC12345"), "two failures are still allowed");

        limiter.recordFailure("rn:ABC12345");
        assertTrue(limiter.minutesLockedFor("rn:ABC12345") > 0);
        assertTrue(limiter.minutesLockedFor("rn:ABC12345") <= 15);
    }

    @Test
    @DisplayName("One account's failures do not lock another, and the identifier is case-insensitive")
    void isPerAccount() {
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(2, 15);

        limiter.recordFailure("rn:ABC12345");
        limiter.recordFailure("RN:abc12345");

        assertTrue(limiter.minutesLockedFor("rn:ABC12345") > 0);
        assertEquals(0, limiter.minutesLockedFor("rn:OTHER9999"));
    }

    @Test
    @DisplayName("A successful sign-in clears the count")
    void successResets() {
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(2, 15);
        limiter.recordFailure("rn:ABC12345");

        limiter.recordSuccess("rn:ABC12345");
        limiter.recordFailure("rn:ABC12345");

        assertEquals(0, limiter.minutesLockedFor("rn:ABC12345"));
    }
}
