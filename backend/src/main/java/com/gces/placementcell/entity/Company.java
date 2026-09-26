package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Employer whose details are stored once and shared by every job it posts.
 */
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name cannot exceed 150 characters")
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Size(max = 10, message = "Short name cannot exceed 10 characters")
    @Column(name = "short_name", length = 10)
    private String shortName;

    @Size(max = 1000, message = "Logo URL cannot exceed 1000 characters")
    @Column(name = "logo_url", length = 1000)
    private String logoUrl;

    @Size(max = 10, message = "Logo colour cannot exceed 10 characters")
    @Column(name = "logo_color", length = 10)
    private String logoColor;

    @Size(max = 4000, message = "About cannot exceed 4000 characters")
    @Column(name = "about", length = 4000)
    private String about;

    @Size(max = 500, message = "Website cannot exceed 500 characters")
    @Column(name = "website", length = 500)
    private String website;

    @Size(max = 100, message = "Industry cannot exceed 100 characters")
    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
