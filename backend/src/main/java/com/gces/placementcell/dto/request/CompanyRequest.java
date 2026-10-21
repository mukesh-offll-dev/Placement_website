package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A recruiting company, as created from the admin job drive form.
 *
 * Only the fields that screen collects; the rest of Company (logo, about,
 * website) is filled in elsewhere.
 */
public record CompanyRequest(

        @NotBlank(message = "Company name is required")
        @Size(max = 150, message = "Company name cannot exceed 150 characters")
        String name,

        @Size(max = 100, message = "Industry cannot exceed 100 characters")
        String industry,

        @Size(max = 500, message = "Website cannot exceed 500 characters")
        String website
) {
}
