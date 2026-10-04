package com.gces.placementcell;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:auth-http-tests;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class AuthHttpIntegrationTests {

    private static final String EMAIL = "http-integration@example.edu";
    private static final String PASSWORD = "http-test-password";

    @LocalServerPort
    private int port;

        @Autowired
        private ObjectMapper objectMapper;

    @Autowired
        private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void createStudentAccount() {
        userRepository.deleteAll();
        userRepository.save(User.builder()
                .email(EMAIL)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .isDeleted(false)
                .build());
    }

    @Test
    void loginTokenAndProtectedIdentityWorkOverHttp() throws Exception {
        String apiUrl = "http://localhost:" + port + "/api";
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpResponse<String> missingTokenResponse = httpClient.send(
                HttpRequest.newBuilder(URI.create(apiUrl + "/auth/me")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(missingTokenResponse.statusCode()).isEqualTo(401);

        HttpRequest loginRequest = HttpRequest.newBuilder(URI.create(apiUrl + "/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                        Map.of("email", EMAIL, "password", PASSWORD))))
                .build();
        HttpResponse<String> loginResponse = httpClient.send(loginRequest, HttpResponse.BodyHandlers.ofString());
        assertThat(loginResponse.statusCode()).isEqualTo(200);
        String token = objectMapper.readTree(loginResponse.body()).path("data").path("accessToken").asText();
        assertThat(token).isNotBlank();

        HttpRequest identityRequest = HttpRequest.newBuilder(URI.create(apiUrl + "/auth/me"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        HttpResponse<String> identityResponse = httpClient.send(
                identityRequest, HttpResponse.BodyHandlers.ofString());
        assertThat(identityResponse.statusCode()).isEqualTo(200);
        JsonNode identity = objectMapper.readTree(identityResponse.body()).path("data");
        assertThat(identity.path("email").asText()).isEqualTo(EMAIL);
        assertThat(identity.path("role").asText()).isEqualTo("STUDENT");

        HttpRequest invalidLoginRequest = HttpRequest.newBuilder(URI.create(apiUrl + "/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                        Map.of("email", EMAIL, "password", "invalid-http-test-password"))))
                .build();
        HttpResponse<String> invalidLoginResponse = httpClient.send(
                invalidLoginRequest, HttpResponse.BodyHandlers.ofString());
        assertThat(invalidLoginResponse.statusCode()).isEqualTo(401);
    }
}