package com.gces.placementcell.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Locks an account to first-login setup until its initial password has been replaced.
 *
 * AdminAuthFilter and CustomUserDetailsService mark such an account's UserDetails as
 * "credentials expired". This filter then refuses every request except the ones needed to
 * finish setup and sign out. Enforcing it here, on the server, means a student cannot skip the
 * setup page by calling the API directly.
 */
@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    /** Paths (without the /api context) that stay open while a password change is pending. */
    private static final Set<String> ALLOWED = Set.of(
            "/student/account/setup",
            "/auth/me",
            "/auth/logout"
    );

    static final String ERROR_CODE = "PASSWORD_CHANGE_REQUIRED";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof UserDetails principal
                && !principal.isCredentialsNonExpired()
                && !isAllowed(request)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"success\":false,\"code\":\"" + ERROR_CODE + "\","
                    + "\"message\":\"You must change your password and complete your profile before continuing.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private static boolean isAllowed(HttpServletRequest request) {
        String path = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && path.startsWith(context)) {
            path = path.substring(context.length());
        }
        // The API is also reachable as /api/... when no context path is stripped (see SecurityConfig).
        if (path.startsWith("/api/")) {
            path = path.substring(4);
        }
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return ALLOWED.contains(path);
    }
}
