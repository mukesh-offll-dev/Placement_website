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
import java.util.Optional;

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

    private final SecretKey signingKey;
    private final long tokenValidityMillis;
    private final UserRepository userRepository;

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
            Optional<User> user = uid != null
                    ? userRepository.findByIdAndIsDeletedFalse(uid.longValue())
                    : userRepository.findByEmailAndIsDeletedFalse(email);

            return user.filter(u -> u.getEmail().equalsIgnoreCase(email)
                    && Boolean.TRUE.equals(u.getIsActive()));
        } catch (Exception e) {
            return Optional.empty();
        }
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
