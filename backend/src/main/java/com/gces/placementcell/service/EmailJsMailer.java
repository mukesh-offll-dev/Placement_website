package com.gces.placementcell.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The only way the backend sends email: through EmailJS (the same service and template the
 * frontend uses), over its REST API. There is no SMTP server involved.
 *
 * The template must use {{to_email}}, {{to_name}}, {{subject}} and {{message}} and send to
 * {{to_email}}. Calling EmailJS from a server also needs "Allow EmailJS API for non-browser
 * applications" turned on under Account > Security in the EmailJS dashboard, and the account's
 * private key as EMAILJS_PRIVATE_KEY.
 */
@Component
@Slf4j
public class EmailJsMailer {

    private static final URI ENDPOINT = URI.create("https://api.emailjs.com/api/v1.0/email/send");

    private final String serviceId;
    private final String templateId;
    private final String publicKey;
    private final String privateKey;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();

    public EmailJsMailer(@Value("${app.emailjs.service-id:}") String serviceId,
                         @Value("${app.emailjs.template-id:}") String templateId,
                         @Value("${app.emailjs.public-key:}") String publicKey,
                         @Value("${app.emailjs.private-key:}") String privateKey) {
        this.serviceId = serviceId;
        this.templateId = templateId;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    /** True when the service, template and keys are all set. */
    public boolean isConfigured() {
        return !serviceId.isBlank() && !templateId.isBlank() && !publicKey.isBlank();
    }

    /** Sends one message; throws {@link EmailDeliveryException} when EmailJS does not accept it. */
    public void send(String toEmail, String toName, String subject, String body) {
        if (!isConfigured()) {
            throw new EmailDeliveryException("EmailJS is not configured");
        }
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("to_email", toEmail);
        params.put("to_name", toName == null || toName.isBlank() ? "Student" : toName);
        // A subject is one line; the body may have line breaks.
        params.put("subject", subject == null ? "" : subject.replaceAll("[\\r\\n]+", " ").trim());
        params.put("message", body);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service_id", serviceId);
        payload.put("template_id", templateId);
        payload.put("user_id", publicKey);
        if (!privateKey.isBlank()) {
            payload.put("accessToken", privateKey);
        }
        payload.put("template_params", params);

        try {
            HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new EmailDeliveryException("EmailJS answered " + response.statusCode() + ": " + response.body());
            }
        } catch (IOException ex) {
            throw new EmailDeliveryException("EmailJS could not be reached: " + ex.getMessage());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new EmailDeliveryException("Interrupted while sending email");
        }
    }

    /** A message EmailJS did not accept. Carries no recipient address, so it is safe to log. */
    public static class EmailDeliveryException extends RuntimeException {
        public EmailDeliveryException(String message) {
            super(message);
        }
    }
}
