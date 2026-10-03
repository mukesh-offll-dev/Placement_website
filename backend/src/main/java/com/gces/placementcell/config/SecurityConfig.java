package com.gces.placementcell.config;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.security.TokenAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for role-based access control.
 * Authenticates users against the existing database schema via UserRepository
 * and enforces role-based access for Students and Admins.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CorsConfig corsConfig;
    private final TokenAuthenticationFilter tokenAuthenticationFilter;

    public SecurityConfig(CorsConfig corsConfig, TokenAuthenticationFilter tokenAuthenticationFilter) {
        this.corsConfig = corsConfig;
        this.tokenAuthenticationFilter = tokenAuthenticationFilter;
    }

    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return email -> {
            User user = userRepository.findByEmailAndIsDeletedFalse(email)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
            return org.springframework.security.core.userdetails.User.builder()
                    .username(user.getEmail())
                    .password(user.getPasswordHash())
                    .disabled(!user.isAccountActive())
                    .roles(user.getRole().name())
                    .build();
        };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/health", "/health/**").permitAll()
                .requestMatchers("/auth/**").permitAll()
                // Admin endpoints – restricted to ADMIN role
                .requestMatchers("/admin/**").hasRole(UserRole.ADMIN.name())
                // Student endpoints – restricted to STUDENT role
                .requestMatchers("/student/**").hasRole(UserRole.STUDENT.name())
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .addFilterBefore(tokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // Allow H2 console frames in dev
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
