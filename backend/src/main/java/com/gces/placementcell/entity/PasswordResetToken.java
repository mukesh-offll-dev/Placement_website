package com.gces.placementcell.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One emailed password-reset link. Only the SHA-256 of the token is kept (never the token
 * itself), and a token works once, before {@code expiresAt}. Maps to table 'password_reset_tokens'.
 */
@Entity
@Table(
    name = "password_reset_tokens",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_password_reset_token_hash", columnNames = {"token_hash"})
    },
    indexes = {
        @Index(name = "idx_password_reset_user_created", columnList = "user_id, created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user", "tokenHash"})
@EqualsAndHashCode(of = "id")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_password_reset_user"))
    private User user;

    /** Hex SHA-256 of the raw token. */
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Set when the link is used, or when a newer link for the same user replaces it. */
    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public boolean isUsable(LocalDateTime now) {
        return usedAt == null && expiresAt != null && expiresAt.isAfter(now);
    }
}
