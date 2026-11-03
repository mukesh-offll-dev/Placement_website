package com.gces.placementcell.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing against one account.
 *
 * A new student's password is their register number, which is not secret, so without this an
 * attacker could walk through register numbers trying each as its own password. After
 * {@code maxFailures} wrong passwords within the window the identifier is locked out until the
 * window passes. State is in memory (per server instance), which is enough to stop casual
 * guessing; a shared limiter would be needed behind several instances.
 */
@Component
public class LoginAttemptLimiter {

    private record Attempts(int failures, long windowStartMs) {
    }

    private static final int MAX_TRACKED = 10_000;

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final int maxFailures;
    private final long windowMs;

    public LoginAttemptLimiter(@Value("${app.security.login-max-failures:5}") int maxFailures,
                               @Value("${app.security.login-lockout-minutes:15}") long lockoutMinutes) {
        this.maxFailures = Math.max(1, maxFailures);
        this.windowMs = Math.max(1, lockoutMinutes) * 60_000L;
    }

    /** Whole minutes left on a lockout, or 0 when the identifier may try. */
    public long minutesLockedFor(String identifier) {
        Attempts current = attempts.get(key(identifier));
        if (current == null) {
            return 0;
        }
        long remainingMs = current.windowStartMs() + windowMs - System.currentTimeMillis();
        if (remainingMs <= 0) {
            attempts.remove(key(identifier));
            return 0;
        }
        return current.failures() >= maxFailures ? Math.max(1, (remainingMs + 59_999) / 60_000) : 0;
    }

    public void recordFailure(String identifier) {
        long now = System.currentTimeMillis();
        if (attempts.size() >= MAX_TRACKED) {
            attempts.entrySet().removeIf(e -> e.getValue().windowStartMs() + windowMs <= now);
            if (attempts.size() >= MAX_TRACKED) {
                attempts.clear();
            }
        }
        attempts.merge(key(identifier), new Attempts(1, now), (old, fresh) ->
                old.windowStartMs() + windowMs <= now ? fresh : new Attempts(old.failures() + 1, old.windowStartMs()));
    }

    public void recordSuccess(String identifier) {
        attempts.remove(key(identifier));
    }

    private static String key(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase(Locale.ROOT);
    }
}
