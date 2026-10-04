package com.gces.placementcell.security;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * Generates and validates stateless HMAC-SHA256 signed authentication tokens.
 * Works seamlessly with zero external JWT libraries required.
 */
@Component
public class TokenProvider {

    private final byte[] secretKey;
    private final long tokenValidityMillis;
    private final UserRepository userRepository;

    public TokenProvider(
            @Value("${app.jwt.secret:${JWT_SECRET:}}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long validityMillis,
            UserRepository userRepository) {
        this.tokenValidityMillis = validityMillis > 0 ? validityMillis : 86400000L;
        this.userRepository = userRepository;

        if (secret != null && !secret.isBlank()) {
            this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
        } else {
            // Secure 256-bit fallback secret
            byte[] randomKey = new byte[32];
            new SecureRandom().nextBytes(randomKey);
            this.secretKey = randomKey;
        }
    }

    /**
     * Generate an HMAC signed token for a user.
     * Format: Base64Url(payload) + "." + Base64Url(HMAC(payload))
     */
    public String generateToken(User user) {
        long expiry = System.currentTimeMillis() + tokenValidityMillis;
        String payload = user.getId() + ":" + user.getEmail() + ":" + user.getRole().name() + ":" + expiry;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    /**
     * Validate token and load user from database.
     */
    public Optional<User> validateTokenAndGetUser(String token) {
        if (token == null || !token.contains(".")) {
            return Optional.empty();
        }

        try {
            int dot = token.indexOf('.');
            String encodedPayload = token.substring(0, dot);
            String providedSignature = token.substring(dot + 1);

            String expectedSignature = sign(encodedPayload);
            if (!expectedSignature.equals(providedSignature)) {
                return Optional.empty();
            }

            String payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
            String[] parts = payload.split(":");
            if (parts.length < 4) {
                return Optional.empty();
            }

            Long userId = Long.parseLong(parts[0]);
            String email = parts[1];
            long expiry = Long.parseLong(parts[3]);

            if (System.currentTimeMillis() > expiry) {
                return Optional.empty();
            }

            return userRepository.findByIdAndIsDeletedFalse(userId)
                    .filter(u -> u.getEmail().equalsIgnoreCase(email) && Boolean.TRUE.equals(u.getIsActive()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey, "HmacSHA256"));
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC signature", e);
        }
    }
}
