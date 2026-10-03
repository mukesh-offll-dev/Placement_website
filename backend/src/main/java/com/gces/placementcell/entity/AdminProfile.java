package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing admin and placement officer profiles.
 * 1:1 relationship with User table (where role IN ('ADMIN', 'PLACEMENT_OFFICER')).
 */
@Entity
@Table(
    name = "admin_profiles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_admin_profiles_user", columnNames = {"user_id"})
    },
    indexes = {
        @Index(name = "uq_admin_profiles_user", columnList = "user_id", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
@EqualsAndHashCode(of = "id")
public class AdminProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User reference is required")
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        unique = true,
        foreignKey = @ForeignKey(name = "fk_admin_profiles_user")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @NotBlank(message = "Name is required")
    @Size(max = 120, message = "Name cannot exceed 120 characters")
    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @NotBlank(message = "Designation is required")
    @Size(max = 60, message = "Designation cannot exceed 60 characters")
    @Column(name = "designation", nullable = false, length = 60)
    private String designation;

    @Size(max = 100, message = "Department cannot exceed 100 characters")
    @Column(name = "department", length = 100)
    private String department;

    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Contact email cannot exceed 150 characters")
    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Size(max = 255, message = "Avatar URL cannot exceed 255 characters")
    @Column(name = "avatar", length = 255)
    private String avatar;

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
