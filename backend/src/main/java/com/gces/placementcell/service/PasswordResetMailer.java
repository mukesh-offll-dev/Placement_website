package com.gces.placementcell.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Emails the reset link. A separate bean, so {@code @Async} applies and a slow or failing mail
 * server can neither delay the response nor tell the caller whether an account exists.
 *
 * Neither the link nor the token is ever logged.
 */
@Slf4j
@Component
public class PasswordResetMailer {

    private final EmailJsMailer mailer;
    private final String frontendUrl;
    private final long tokenMinutes;

    public PasswordResetMailer(EmailJsMailer mailer,
                               @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
                               @Value("${app.password-reset.token-minutes:30}") long tokenMinutes) {
        this.mailer = mailer;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        this.tokenMinutes = Math.max(1, tokenMinutes);
    }

    @Async
    public void sendResetEmail(String toEmail, String toName, String rawToken) {
        if (!mailer.isConfigured()) {
            log.warn("A password reset was requested but EmailJS is not configured (EMAILJS_*), so no email was sent.");
            return;
        }
        try {
            mailer.send(toEmail, toName, "Reset your GCE Srirangam placement portal password", buildBody(toName, rawToken));
        } catch (EmailJsMailer.EmailDeliveryException ex) {
            log.warn("Could not send a password reset email: {}", ex.getMessage());
        }
    }

    String buildBody(String name, String rawToken) {
        return "Hello" + (name == null || name.isBlank() ? "" : " " + name.trim()) + ",\n\n"
                + "We received a request to reset the password of your placement portal account.\n\n"
                + "Reset your password: " + frontendUrl + "/reset-password?token=" + rawToken + "\n\n"
                + "This link works once and expires in " + tokenMinutes + " minutes.\n"
                + "If you did not ask for this, ignore this email; your password stays the same.\n\n"
                + "GCE Srirangam Placement Cell\n";
    }
}
