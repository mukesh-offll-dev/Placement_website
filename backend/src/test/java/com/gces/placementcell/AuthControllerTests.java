package com.gces.placementcell;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:auth-tests;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
        private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    @BeforeEach
    void createStudentAccount() {
        userRepository.deleteAll();
        userRepository.save(User.builder()
                .email("student@example.edu")
                .passwordHash(passwordEncoder.encode("correct-password"))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .build());
    }

    @Test
    void validCredentialsReturnJwtAcceptedAsBearerToken() throws Exception {
        String token = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"student@example.edu\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString()
                .replaceAll("(?s).*\\\"accessToken\\\":\\\"([^\\\"]+)\\\".*", "$1");

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("student@example.edu"))
            .andExpect(jsonPath("$.data.role").value("STUDENT"));
    }

    @Test
    void invalidPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"student@example.edu\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownEmailReturnsSameUnauthorizedResponse() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"unknown@example.edu\",\"password\":\"correct-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void protectedRouteRejectsRequestsWithoutBearerToken() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsPublicAndViteCorsOriginIsAllowed() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().exists("Access-Control-Allow-Headers"));
    }

    @Test
    void corsRejectsUnconfiguredOrigins() throws Exception {
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void expiredAndMalformedTokensAreRejected() throws Exception {
        Instant now = Instant.now();
        String expiredToken = jwtEncoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(),
                        JwtClaimsSet.builder()
                                .issuer("placement-cell")
                                .issuedAt(now.minusSeconds(120))
                                .expiresAt(now.minusSeconds(60))
                                .subject("student@example.edu")
                                .claim("role", "STUDENT")
                                .build())).getTokenValue();
        String validToken = jwtEncoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(),
                        JwtClaimsSet.builder()
                                .issuer("placement-cell")
                                .issuedAt(now)
                                .expiresAt(now.plusSeconds(60))
                                .subject("student@example.edu")
                                .claim("role", "STUDENT")
                                .build())).getTokenValue();
        int signatureStart = validToken.lastIndexOf('.') + 1;
        char firstSignatureCharacter = validToken.charAt(signatureStart);
        String tamperedToken = validToken.substring(0, signatureStart)
                + (firstSignatureCharacter == 'A' ? 'B' : 'A')
                + validToken.substring(signatureStart + 1);
        String wrongIssuerToken = jwtEncoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(),
                        JwtClaimsSet.builder()
                                .issuer("untrusted-issuer")
                                .issuedAt(now)
                                .expiresAt(now.plusSeconds(60))
                                .subject("student@example.edu")
                                .claim("role", "STUDENT")
                                .build())).getTokenValue();

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + wrongIssuerToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }
}