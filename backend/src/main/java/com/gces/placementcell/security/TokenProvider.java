package com.gces.placementcell.security;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Issues and validates the bearer tokens used by every authenticated request.
 *
 * Tokens are standard HS256 JWTs (header.payload.signature) because the frontend
 * decodes the payload to read {@code exp} and decide whether the user is still
 * signed in; a non-JWT format makes that check fail and logs every user out.
 *
 * Claims: {@code sub} = email, {@code uid} = user id, {@code role} = UserRole name.
 * The signing key is the same {@code app.jwt.secret} JwtService uses, so tokens
 * from either class validate here.
 */
@Component
public class TokenProvider {

    /** HS256 needs a key of at least 256 bits. */
    private static final int MIN_KEY_BYTES = 32;

    private static final long USER_CACHE_TTL_MS = 30_000;
    private static final int USER_CACHE_MAX_ENTRIES = 1_000;

    private final SecretKey signingKey;
    private final long tokenValidityMillis;
    private final UserRepository userRepository;
    private final Map<String, CachedUser> userCache = new ConcurrentHashMap<>();

    public TokenProvider(
            @Value("${app.jwt.secret:${JWT_SECRET:}}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long validityMillis,
            UserRepository userRepository) {
        this.tokenValidityMillis = validityMillis > 0 ? validityMillis : 86400000L;
        this.userRepository = userRepository;
        this.signingKey = Keys.hmacShaKeyFor(keyBytes(secret));
    }

    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + tokenValidityMillis))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Returns the active, non-deleted user the token belongs to, or empty if the token
     * is malformed, tampered with, expired, or names a user that no longer qualifies.
     */
    public Optional<User> validateTokenAndGetUser(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        try {
            // parseSignedClaims verifies the signature and rejects expired tokens.
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String email = claims.getSubject();
            if (email == null || email.isBlank()) {
                return Optional.empty();
            }

            Number uid = claims.get("uid", Number.class);
            String cacheKey = uid != null ? "id:" + uid.longValue() : "email:" + email.toLowerCase();
            Optional<User> user = lookupUser(cacheKey, () -> uid != null
                    ? userRepository.findByIdAndIsDeletedFalse(uid.longValue())
                    : userRepository.findByEmailAndIsDeletedFalse(email));

            return user.filter(u -> u.getEmail().equalsIgnoreCase(email)
                    && Boolean.TRUE.equals(u.getIsActive()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * The token's signature and expiry are checked on every request, but the user row behind
     * it is reused for a short time: re-reading it costs a database round trip per call, which
     * dominates latency on a remote database. A deactivated or deleted account is locked out
     * within this window rather than instantly. Misses are not cached.
     */
    private Optional<User> lookupUser(String key, Supplier<Optional<User>> loader) {
        long now = System.currentTimeMillis();
        CachedUser hit = userCache.get(key);
        if (hit != null && hit.expiresAtMs() > now) {
            return Optional.of(hit.user());
        }
        Optional<User> loaded = loader.get();
        if (loaded.isPresent()) {
            if (userCache.size() >= USER_CACHE_MAX_ENTRIES) {
                userCache.clear();
            }
            userCache.put(key, new CachedUser(loaded.get(), now + USER_CACHE_TTL_MS));
        } else {
            userCache.remove(key);
        }
        return loaded;
    }

    /**
     * Forgets a cached user so a change to their account (deactivated, password changed, email
     * changed) applies to the very next request instead of after the cache window.
     */
    public void evictUser(Long id, String email) {
        if (id != null) {
            userCache.remove("id:" + id);
        }
        if (email != null) {
            userCache.remove("email:" + email.toLowerCase());
        }
    }

    private record CachedUser(User user, long expiresAtMs) {
    }

    private static byte[] keyBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            // No secret configured: tokens stay valid only until restart.
            byte[] random = new byte[MIN_KEY_BYTES];
            new SecureRandom().nextBytes(random);
            return random;
        }
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= MIN_KEY_BYTES) {
            return raw;
        }
        // Stretch a short secret rather than refusing to start.
        try {
            return MessageDigest.getInstance("SHA-256").digest(raw);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
