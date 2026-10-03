package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing recipient delivery and read status for notifications.
 */
@Entity
@Table(
    name = "notification_recipients",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_notification_recipient", columnNames = {"notification_id", "user_id"})
    },
    indexes = {
        @Index(name = "uq_notification_recipient", columnList = "notification_id, user_id", unique = true),
        @Index(name = "idx_notification_recipients_user", columnList = "user_id"),
        @Index(name = "idx_notification_recipients_read", columnList = "is_read"),
        @Index(name = "idx_notification_recipients_notification", columnList = "notification_id"),
        @Index(name = "idx_notification_recipients_user_read", columnList = "user_id, is_read")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"notification", "user"})
@EqualsAndHashCode(of = "id")
public class NotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Notification reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "notification_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notif_recip_notif")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Notification notification;

    @NotNull(message = "User reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notif_recip_user")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isRead == null) {
            this.isRead = false;
        }
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
