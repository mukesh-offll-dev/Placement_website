package com.gces.placementcell.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("CORS allowed origins")
class CorsConfigTest {

    @Test
    @DisplayName("prod with no explicit origins still allows APP_FRONTEND_URL (trailing slash stripped)")
    void prodAllowsFrontendUrl() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        CorsConfig config = new CorsConfig(env, List.of(), "https://placement.vercel.app/");

        assertEquals(List.of("https://placement.vercel.app"), config.getAllowedOrigins());
    }

    @Test
    @DisplayName("dev always includes the Vite dev server, without duplicates")
    void devIncludesVite() {
        CorsConfig config = new CorsConfig(new MockEnvironment(),
                List.of("http://localhost:5173", "http://localhost:3000"), "http://localhost:5173/");

        assertEquals(List.of("http://localhost:5173", "http://localhost:3000"), config.getAllowedOrigins());
    }

    @Test
    @DisplayName("prod does not add localhost")
    void prodHasNoLocalhost() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        CorsConfig config = new CorsConfig(env, List.of("https://custom.example"), "");

        assertTrue(config.getAllowedOrigins().contains("https://custom.example"));
        assertFalse(config.getAllowedOrigins().contains(CorsConfig.VITE_DEV_ORIGIN));
    }
}
