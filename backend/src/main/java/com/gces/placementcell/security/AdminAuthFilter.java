package com.gces.placementcell.security;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAuthFilter extends OncePerRequestFilter {

    private final TokenProvider tokenProvider;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            Optional<User> authenticatedUser = resolveUser(request);

            if (authenticatedUser.isPresent()) {
                User user = authenticatedUser.get();
                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                );

                // The principal must be a UserDetails: controllers resolve it with
                // @AuthenticationPrincipal UserDetails, which yields null for a plain String.
                UserDetails principal = org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password("")
                        .authorities(authorities)
                        .build();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private Optional<User> resolveUser(HttpServletRequest request) {
        // 1. Check Authorization: Bearer <token>
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7).trim();
            Optional<User> user = tokenProvider.validateTokenAndGetUser(token);
            if (user.isPresent()) {
                return user;
            }
        }

        // 2. Check X-Auth-Token header
        String customToken = request.getHeader("X-Auth-Token");
        if (StringUtils.hasText(customToken)) {
            Optional<User> user = tokenProvider.validateTokenAndGetUser(customToken.trim());
            if (user.isPresent()) {
                return user;
            }
        }

        // 3. Check X-Admin-Email header for integration / test convenience
        String adminEmail = request.getHeader("X-Admin-Email");
        if (StringUtils.hasText(adminEmail)) {
            return userRepository.findByEmailAndIsDeletedFalse(adminEmail.trim())
                    .filter(u -> Boolean.TRUE.equals(u.getIsActive()));
        }

        return Optional.empty();
    }
}
