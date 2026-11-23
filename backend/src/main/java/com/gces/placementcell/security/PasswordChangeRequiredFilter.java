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
 * Locks an account until its initial (or temporary) password has been replaced.
 *
 * AdminAuthFilter and CustomUserDetailsService mark such an account's UserDetails as
 * "credentials expired". This filter then refuses every request except the ones needed to
 * finish: students may only do first-login setup; staff (admin, officer, faculty advisor) may only
 * call POST /auth/change-password. Both may read /auth/me and sign out. Enforcing it here, on the
 * server, means nobody can skip the step by calling the API directly.
 */
@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    /** Paths (without the /api context) that stay open while a student's setup is pending. */
    private static final Set<String> STUDENT_ALLOWED = Set.of(
            "/student/account/setup",
            "/auth/me",
            "/auth/logout"
    );

    /** Paths that stay open while a staff member's password change is pending. */
    private static final Set<String> STAFF_ALLOWED = Set.of(
            "/auth/change-password",
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
                && !principal.isCredentialsNonExpired()) {
            boolean student = principal.getAuthorities().stream().anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));
            if (!(student ? STUDENT_ALLOWED : STAFF_ALLOWED).contains(path(request))) {
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                String message = student
                        ? "You must change your password and complete your profile before continuing."
                        : "You must change your password before continuing.";
                response.getWriter().write("{\"success\":false,\"code\":\"" + ERROR_CODE + "\","
                        + "\"message\":\"" + message + "\",\"data\":null}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private static String path(HttpServletRequest request) {
        String path = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && path.startsWith(context)) {
            path = path.substring(context.length());
        }
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }
}
