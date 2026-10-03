package com.gces.placementcell.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * Token provider for generating and validating cryptographically signed HMAC-SHA256 authentication tokens.
 */
@Component
public class TokenProvider {

    private final byte[] secretKeyBytes;
    private final long validityInSeconds;
    private final ObjectMapper objectMapper;

    public TokenProvider(
            @Value("${app.security.token.secret:gces-placement-cell-super-secret-key-2026-secure-hmac-sha256}") String secret,
            @Value("${app.security.token.validity-seconds:86400}") long validityInSeconds,
            ObjectMapper objectMapper) {
        this.secretKeyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.validityInSeconds = validityInSeconds;
        this.objectMapper = objectMapper;
    }

    public String generateToken(Long userId, String email, String role) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + validityInSeconds;

            Map<String, Object> header = Map.of(
                    "alg", "HS256",
                    "typ", "JWT"
            );

            Map<String, Object> payload = Map.of(
                    "sub", email,
                    "userId", userId,
                    "role", role,
                    "iat", now,
                    "exp", exp
            );

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(objectMapper.writeValueAsBytes(payload));
            String dataToSign = encodedHeader + "." + encodedPayload;

            String signature = sign(dataToSign);
            return dataToSign + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Error generating authentication token", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }

            String dataToSign = parts[0] + "." + parts[1];
            String expectedSignature = sign(dataToSign);

            if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                return false;
            }

            Map<String, Object> claims = getClaims(parts[1]);
            long exp = ((Number) claims.get("exp")).longValue();
            return Instant.now().getEpochSecond() < exp;
        } catch (Exception e) {
            return false;
        }
    }

    public String getEmailFromToken(String token) {
        String[] parts = token.split("\\.");
        Map<String, Object> claims = getClaims(parts[1]);
        return (String) claims.get("sub");
    }

    public String getRoleFromToken(String token) {
        String[] parts = token.split("\\.");
        Map<String, Object> claims = getClaims(parts[1]);
        return (String) claims.get("role");
    }

    private Map<String, Object> getClaims(String encodedPayload) {
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(encodedPayload);
            return objectMapper.readValue(bytes, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid token payload", e);
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKeyBytes, "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Error calculating token signature", e);
        }
    }
}
