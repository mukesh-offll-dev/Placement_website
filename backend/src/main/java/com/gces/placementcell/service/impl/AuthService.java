package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.LoginRequest;
import com.gces.placementcell.dto.response.AuthTokenResponse;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final Duration tokenLifetime;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.expiration:PT15M}") Duration tokenLifetime) {
        if (tokenLifetime.isZero() || tokenLifetime.isNegative()) {
            throw new IllegalArgumentException("JWT expiration must be positive");
        }
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.tokenLifetime = tokenLifetime;
    }

    public AuthTokenResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadCredentialsException("Invalid email or password");
        }
        User account = userRepository.findByEmailAndIsDeletedFalse(email)
            .filter(User::isStudent)
            .filter(User::isAccountActive)
            .filter(student -> passwordEncoder.matches(request.password(), student.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(tokenLifetime);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("placement-cell")
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject(account.getEmail())
                .claim("role", "STUDENT")
                .build();
        String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        return new AuthTokenResponse(accessToken, "Bearer", tokenLifetime.toSeconds());
    }
}