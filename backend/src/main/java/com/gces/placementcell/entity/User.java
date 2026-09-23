package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing the single login table for all actors (STUDENT, PLACEMENT_OFFICER, ADMIN, RECRUITER).
 * Role decides which profile table holds the extended details.
 */
@Entity
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_users_email", columnNames = {"email"})
    },
    indexes = {
        @Index(name = "uq_users_email", columnList = "email", unique = true),
        @Index(name = "idx_users_role", columnList = "role"),
        @Index(name = "idx_users_account_status", columnList = "account_status"),
        @Index(name = "idx_users_created_at", columnList = "created_at"),
        @Index(name = "idx_users_role_active", columnList = "role, is_active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "passwordHash")
@EqualsAndHashCode(of = "id")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @NotBlank(message = "Password hash is required")
    @Size(max = 255, message = "Password hash length cannot exceed 255 characters")
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @NotNull(message = "Role is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private UserRole role;

    @NotNull(message = "Account status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "account_status", nullable = false, length = 50)
    private AccountStatus accountStatus = AccountStatus.PENDING;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_email_verified", nullable = false)
    private Boolean isEmailVerified = false;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.accountStatus == null) {
            this.accountStatus = AccountStatus.PENDING;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.isEmailVerified == null) {
            this.isEmailVerified = false;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper convenience methods
    public boolean isStudent() {
        return UserRole.STUDENT.equals(this.role);
    }

    public boolean isAdmin() {
        return UserRole.ADMIN.equals(this.role);
    }

    public boolean isPlacementOfficer() {
        return UserRole.PLACEMENT_OFFICER.equals(this.role);
    }

    public boolean isRecruiter() {
        return UserRole.RECRUITER.equals(this.role);
    }

    public boolean isAccountActive() {
        return Boolean.TRUE.equals(this.isActive) && 
               !Boolean.TRUE.equals(this.isDeleted) && 
               AccountStatus.ACTIVE.equals(this.accountStatus);
    }
}
