package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.NotificationAudience;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A notification published by an administrator. This row is the broadcast itself;
 * per-user delivery and read state live in {@link NotificationRecipient}.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_status", columnList = "status"),
        @Index(name = "idx_notifications_type", columnList = "notification_type"),
        @Index(name = "idx_notifications_target_audience", columnList = "target_audience"),
        @Index(name = "idx_notifications_created_at", columnList = "created_at"),
        @Index(name = "idx_notifications_published_at", columnList = "published_at"),
        @Index(name = "idx_notifications_created_by", columnList = "created_by"),
        @Index(name = "idx_notifications_related_job", columnList = "related_job_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"recipients"})
@EqualsAndHashCode(of = "id")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Notification title is required")
    @Size(max = 200, message = "Notification title cannot exceed 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @NotBlank(message = "Notification message is required")
    @Size(max = 4000, message = "Notification message cannot exceed 4000 characters")
    @Column(name = "message", nullable = false, length = 4000)
    private String message;

    @NotNull(message = "Notification type is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "notification_type", nullable = false, length = 50)
    private NotificationType notificationType = NotificationType.GENERAL;

    @NotNull(message = "Priority is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "priority", nullable = false, length = 50)
    private NotificationPriority priority = NotificationPriority.NORMAL;

    @NotNull(message = "Target audience is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "target_audience", nullable = false, length = 50)
    private NotificationAudience targetAudience;

    @NotNull(message = "Creating user is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_job_id")
    private Job relatedJob;

    @Column(name = "related_drive_id")
    private Long relatedDriveId;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private NotificationStatus status = NotificationStatus.DRAFT;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<NotificationRecipient> recipients = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.notificationType == null) {
            this.notificationType = NotificationType.GENERAL;
        }
        if (this.priority == null) {
            this.priority = NotificationPriority.NORMAL;
        }
        if (this.status == null) {
            this.status = NotificationStatus.DRAFT;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addRecipient(NotificationRecipient recipient) {
        recipients.add(recipient);
        recipient.setNotification(this);
    }
}
