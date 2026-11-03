package com.gces.placementcell.security;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads a {@link User} from the database by email.
 * Spring Security calls this during authentication.
 *
 * The returned {@link UserDetails} uses the user's email as the username
 * and maps the {@code UserRole} to a Spring {@code ROLE_<ROLE>} authority.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    /**
     * How long an authenticated user's details are reused for token checks. Every API call
     * would otherwise cost a database round trip just to rebuild the same principal, which
     * dominates latency on a remote database. A deactivated or deleted account is therefore
     * locked out within this window rather than instantly.
     */
    private static final long CACHE_TTL_MS = 30_000;
    private static final int CACHE_MAX_ENTRIES = 1_000;

    private final UserRepository userRepository;
    private final Map<String, CachedUser> requestCache = new ConcurrentHashMap<>();

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** For per-request JWT checks: {@link #loadUserByUsername} behind a short-lived cache. */
    public UserDetails loadCached(String email) {
        long now = System.currentTimeMillis();
        CachedUser hit = requestCache.get(email);
        if (hit != null && hit.expiresAtMs() > now) {
            return hit.details();
        }
        UserDetails details = loadUserByUsername(email);
        if (requestCache.size() >= CACHE_MAX_ENTRIES) {
            requestCache.clear();
        }
        requestCache.put(email, new CachedUser(details, now + CACHE_TTL_MS));
        return details;
    }

    /** Drops a cached principal, e.g. right after a password or role change. */
    public void evict(String email) {
        requestCache.remove(email);
    }

    private record CachedUser(UserDetails details, long expiresAtMs) {
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .accountExpired(false)
                .accountLocked(!Boolean.TRUE.equals(user.getIsActive()))
                .credentialsExpired(Boolean.TRUE.equals(user.getMustChangePassword()))
                .disabled(Boolean.TRUE.equals(user.getIsDeleted()))
                .build();
    }
}
