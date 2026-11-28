package com.gces.placementcell.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Password reset email")
class PasswordResetMailerTest {

    @Mock private EmailJsMailer emailJs;

    @Test
    @DisplayName("The email carries the reset link built from the frontend URL, and its lifetime")
    void sendsLink() {
        when(emailJs.isConfigured()).thenReturn(true);
        PasswordResetMailer mailer = new PasswordResetMailer(emailJs, "https://portal.example.edu/", 30);

        mailer.sendResetEmail("asha@example.com", "Asha", "TOKEN123");

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(emailJs).send(eq("asha@example.com"), eq("Asha"), anyString(), body.capture());
        assertTrue(body.getValue().contains("https://portal.example.edu/reset-password?token=TOKEN123"));
        assertTrue(body.getValue().contains("30 minutes"));
        assertTrue(body.getValue().startsWith("Hello Asha,"));
    }

    @Test
    @DisplayName("Without EmailJS configured nothing is sent and nothing throws")
    void notConfigured() {
        when(emailJs.isConfigured()).thenReturn(false);
        PasswordResetMailer mailer = new PasswordResetMailer(emailJs, "http://localhost:5173", 30);

        assertDoesNotThrow(() -> mailer.sendResetEmail("asha@example.com", "Asha", "TOKEN123"));

        verify(emailJs, never()).send(any(), any(), any(), any());
    }

    @Test
    @DisplayName("A delivery failure is swallowed, so it can never reveal anything to the caller")
    void deliveryFailureSwallowed() {
        when(emailJs.isConfigured()).thenReturn(true);
        doThrow(new EmailJsMailer.EmailDeliveryException("EmailJS answered 500")).when(emailJs).send(any(), any(), any(), any());
        PasswordResetMailer mailer = new PasswordResetMailer(emailJs, "http://localhost:5173", 30);

        assertDoesNotThrow(() -> mailer.sendResetEmail("asha@example.com", "Asha", "TOKEN123"));
    }

    @Test
    @DisplayName("A missing name still gives a clean greeting")
    void noName() {
        PasswordResetMailer mailer = new PasswordResetMailer(emailJs, "http://localhost:5173", 30);
        assertTrue(mailer.buildBody(null, "T").startsWith("Hello,"));
        assertFalse(mailer.buildBody("  ", "T").contains("null"));
    }
}
