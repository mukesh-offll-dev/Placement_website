package com.gces.placementcell.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Allowed origins = app.cors.allowed-origins, plus app.frontend-url (APP_FRONTEND_URL) whenever it
 * is set, plus the Vite dev server outside prod. The frontend URL is always included because the
 * Vercel proxy can forward the browser's Origin header: without it, every state-changing request
 * through the proxy would be refused with 403 "Invalid CORS request" when the explicit list is empty.
 */
@Configuration
public class CorsConfig {

    static final String VITE_DEV_ORIGIN = "http://localhost:5173";

    private final List<String> allowedOrigins;

    public CorsConfig(
            Environment environment,
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
            List<String> allowedOrigins,
            @Value("${app.frontend-url:}") String frontendUrl) {
        boolean prod = environment.acceptsProfiles(Profiles.of("prod"));
        if (prod && allowedOrigins.stream().anyMatch(origin -> origin.contains("*"))) {
            throw new IllegalStateException("Production CORS origins must be explicit origins");
        }
        Set<String> origins = new LinkedHashSet<>();
        for (String origin : allowedOrigins) {
            String normalized = stripTrailingSlash(origin);
            if (!normalized.isEmpty()) {
                origins.add(normalized);
            }
        }
        String frontend = stripTrailingSlash(frontendUrl);
        if (!frontend.isEmpty()) {
            origins.add(frontend);
        }
        if (!prod) {
            origins.add(VITE_DEV_ORIGIN);
        }
        this.allowedOrigins = new ArrayList<>(origins);
    }

    List<String> getAllowedOrigins() {
        return List.copyOf(allowedOrigins);
    }

    private static String stripTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
