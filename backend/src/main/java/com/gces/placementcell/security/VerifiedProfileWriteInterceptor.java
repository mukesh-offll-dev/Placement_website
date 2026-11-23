package com.gces.placementcell.security;

import com.gces.placementcell.exception.ProfileChangeRequiresVerificationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** Refuses (409) student calls to endpoints marked {@link VerifiedProfileWrite}. */
public class VerifiedProfileWriteInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (handler instanceof HandlerMethod method && method.hasMethodAnnotation(VerifiedProfileWrite.class)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean student = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority()));
            if (student) {
                throw new ProfileChangeRequiresVerificationException();
            }
        }
        return true;
    }
}
