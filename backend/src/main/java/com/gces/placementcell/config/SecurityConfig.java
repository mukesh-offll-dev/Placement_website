package com.gces.placementcell.config;

import com.gces.placementcell.security.AdminAuthFilter;
import com.gces.placementcell.security.CustomAccessDeniedHandler;
import com.gces.placementcell.security.CustomAuthenticationEntryPoint;
import com.gces.placementcell.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import jakarta.servlet.DispatcherType;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for Placement Cell.
 * Secures /admin/** endpoints requiring ADMIN or PLACEMENT_OFFICER authority.
 */
@Configuration
@EnableWebSecurity
// Without this, every @PreAuthorize in the controllers is inert: the annotations
// read as protection but enforce nothing, leaving only the URL rules below.
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsConfig corsConfig;
    private final AdminAuthFilter adminAuthFilter;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;
    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Boot filters the ERROR dispatch too. Without this, now that the
                // default is authenticated(), a 404 or 500 on a public path would be
                // forwarded to /error and answered 401 — and the frontend treats 401
                // as an expired session and signs the user out.
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                // Public dev & infrastructure endpoints
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/health").permitAll()
                // Must precede the /auth/** permitAll: only an existing admin may create another.
                .requestMatchers("/auth/register/admin").hasRole("ADMIN")
                .requestMatchers("/auth/**").permitAll()
                // Admin endpoints require ADMIN or PLACEMENT_OFFICER authority
                .requestMatchers("/admin/**").hasAnyRole("ADMIN", "PLACEMENT_OFFICER")
                // Student endpoints – restricted to STUDENT role
                .requestMatchers("/student/**").hasRole("STUDENT")
                // Job listings are read-only here (posting and editing live under
                // /admin/jobs), so students can browse drives before signing in.
                .requestMatchers(HttpMethod.GET, "/jobs", "/jobs/**").permitAll()
                // Everything below serves or mutates a specific person's data:
                // resumes (/students/{id}/resume), project media, stored files and
                // notifications. Authenticated only — these were reachable without a
                // login, so anyone could download or delete another student's resume.
                // Note: this proves a caller is signed in, not that the row is theirs;
                // per-owner checks still belong in the services.
                .requestMatchers("/students/**").authenticated()
                .requestMatchers("/projects/**").authenticated()
                .requestMatchers("/files/**").authenticated()
                .requestMatchers("/notifications/**").authenticated()
                // Deny by default: a new controller is protected until a rule opens it.
                .anyRequest().authenticated()
            )
            // Bearer token is the primary scheme; HTTP Basic is a deliberate fallback for
            // API clients and tooling (covered by RoleBasedAccessControlTest).
            .httpBasic(Customizer.withDefaults())
            .addFilterBefore(adminAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // Allow H2 console frames in dev
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
