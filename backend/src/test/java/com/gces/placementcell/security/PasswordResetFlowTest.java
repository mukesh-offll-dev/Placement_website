package com.gces.placementcell.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.entity.PasswordResetToken;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.PasswordResetTokenRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.PasswordResetMailer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Forgot / reset password through the real security chain and database. The mailer is replaced
 * so the test can read the token that would have been emailed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Forgot / reset password (integration)")
class PasswordResetFlowTest {

    private static final String OLD_PASSWORD = "OldPassword1";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentProfileRepository studentProfileRepository;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TokenProvider tokenProvider;
    @MockBean private PasswordResetMailer resetMailer;

    private String tag;
    private User officer;
    private User student;
    private String registerNumber;

    @BeforeEach
    void setUp() {
        tag = UUID.randomUUID().toString().substring(0, 8);
        officer = userRepository.save(User.builder()
                .email("officer-" + tag + "@gces.edu").passwordHash(passwordEncoder.encode(OLD_PASSWORD))
                .role(UserRole.PLACEMENT_OFFICER).accountStatus(AccountStatus.ACTIVE).isActive(true)
                .isEmailVerified(true).isDeleted(false).mustChangePassword(true).build());
        student = userRepository.save(User.builder()
                .email("asha-" + tag + "@example.com").passwordHash(passwordEncoder.encode(OLD_PASSWORD))
                .role(UserRole.STUDENT).accountStatus(AccountStatus.ACTIVE).isActive(true)
                .isEmailVerified(true).isDeleted(false).mustChangePassword(false).build());
        registerNumber = ("8" + Math.abs(tag.hashCode()) + "000000000000").substring(0, 12);
        studentProfileRepository.save(StudentProfile.builder().user(student).fullName("Asha " + tag)
                .email(student.getEmail()).rollNo(registerNumber).department("Computer Science")
                .departmentCode("CSE").placementStatus(PlacementStatus.ACTIVE).profileSetupCompleted(true).build());
    }

    private void forgot(String identifier) throws Exception {
        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", identifier))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }

    private String mailedToken(String email) {
        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(resetMailer).sendResetEmail(eq(email), anyString(), token.capture());
        return token.getValue();
    }

    private org.springframework.test.web.servlet.ResultActions reset(String token, String password) throws Exception {
        return mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", password))));
    }

    private org.springframework.test.web.servlet.ResultActions login(String body) throws Exception {
        return mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("Officer: request a link, reset with it, then only the new password signs in and old sessions die")
    void officerFullFlow() throws Exception {
        String oldSession = tokenProvider.generateToken(officer);
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + oldSession))
                .andExpect(result -> assertNotEquals(401, result.getResponse().getStatus()));

        forgot(officer.getEmail());
        String token = mailedToken(officer.getEmail());

        // The database holds the hash only.
        assertEquals(1, tokenRepository.count());
        PasswordResetToken stored = tokenRepository.findAll().get(0);
        assertNotEquals(token, stored.getTokenHash());
        assertEquals(64, stored.getTokenHash().length());

        reset(token, "BrandNew123")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role", is("PLACEMENT_OFFICER")));

        // New password signs in; the old one no longer does.
        login(objectMapper.writeValueAsString(Map.of("email", officer.getEmail(), "password", "BrandNew123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChangeRequired", is(false)));
        login(objectMapper.writeValueAsString(Map.of("email", officer.getEmail(), "password", OLD_PASSWORD)))
                .andExpect(status().isUnauthorized());
        // The session from before the reset stops working (the JWT carries the password version).
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + oldSession))
                .andExpect(status().isUnauthorized());

        // Single use.
        reset(token, "AnotherNew123").andExpect(status().isBadRequest());
        assertTrue(tokenRepository.findAll().stream().allMatch(t -> t.getUsedAt() != null));
    }

    @Test
    @DisplayName("Student: the register number finds the account and the link goes to the profile email")
    void studentByRegisterNumber() throws Exception {
        forgot(registerNumber.toLowerCase());
        String token = mailedToken(student.getEmail());

        reset(token, "StudentNew123").andExpect(status().isOk()).andExpect(jsonPath("$.data.role", is("STUDENT")));

        login(objectMapper.writeValueAsString(Map.of("registerNumber", registerNumber, "password", "StudentNew123")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("An unknown identifier gets exactly the same answer as a real one, and sends nothing")
    void sameAnswerForUnknown() throws Exception {
        String real = mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", officer.getEmail()))))
                .andReturn().getResponse().getContentAsString();
        String unknown = mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", "nobody-" + tag + "@example.com"))))
                .andReturn().getResponse().getContentAsString();

        assertEquals(real, unknown);
        verify(resetMailer).sendResetEmail(eq(officer.getEmail()), anyString(), anyString());
        verify(resetMailer, never()).sendResetEmail(eq("nobody-" + tag + "@example.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("A newer link retires the older one; the 4th request within the hour is ignored")
    void newerLinkWinsAndThrottle() throws Exception {
        forgot(officer.getEmail());
        ArgumentCaptor<String> tokens = ArgumentCaptor.forClass(String.class);
        forgot(officer.getEmail());
        forgot(officer.getEmail());
        forgot(officer.getEmail()); // 4th: silently ignored
        verify(resetMailer, org.mockito.Mockito.times(3)).sendResetEmail(eq(officer.getEmail()), anyString(), tokens.capture());

        assertEquals(3, tokenRepository.count(), "the 4th request created no token");
        String first = tokens.getAllValues().get(0);
        String newest = tokens.getAllValues().get(2);
        reset(first, "BrandNew123").andExpect(status().isBadRequest());
        reset(newest, "BrandNew123").andExpect(status().isOk());
    }

    @Test
    @DisplayName("An expired link, a made-up link and a weak password are all refused")
    void refusals() throws Exception {
        forgot(officer.getEmail());
        String token = mailedToken(officer.getEmail());

        reset("this-token-was-never-issued", "BrandNew123").andExpect(status().isBadRequest());
        reset(token, "weakpass").andExpect(status().isBadRequest());
        assertFalse(tokenRepository.findAll().get(0).getUsedAt() != null, "a refused password does not burn the link");

        PasswordResetToken stored = tokenRepository.findAll().get(0);
        stored.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        tokenRepository.save(stored);
        reset(token, "BrandNew123").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("A student whose only email is the system stand-in cannot self-reset")
    void studentWithoutRealEmail() throws Exception {
        User stub = userRepository.save(User.builder()
                .email("830999000" + tag.substring(0, 3).replaceAll("[^0-9]", "1") + "@pending.gces.local")
                .passwordHash(passwordEncoder.encode(OLD_PASSWORD)).role(UserRole.STUDENT)
                .accountStatus(AccountStatus.ACTIVE).isActive(true).isDeleted(false).mustChangePassword(true).build());
        String rn = ("9" + Math.abs(("x" + tag).hashCode()) + "000000000000").substring(0, 12);
        studentProfileRepository.save(StudentProfile.builder().user(stub).fullName(rn).email(stub.getEmail())
                .rollNo(rn).placementStatus(PlacementStatus.ACTIVE).profileSetupCompleted(false).build());

        forgot(rn);

        verify(resetMailer, never()).sendResetEmail(anyString(), anyString(), anyString());
        assertEquals(0, tokenRepository.count());
    }

    @Test
    @DisplayName("Password recovery works with a stale session token attached (it is a public call)")
    void publicEvenWithBadToken() throws Exception {
        mockMvc.perform(post("/auth/forgot-password").header("Authorization", "Bearer not-a-real-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("identifier", officer.getEmail()))))
                .andExpect(status().isOk());
    }
}
