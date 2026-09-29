package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.TargetAudience;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing placement announcements, notices, and system alerts.
 * Maps to table 'notifications'. Individual recipients are stored in 'notification_recipients'.
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
@ToString(exclude = {"createdBy", "relatedJob", "relatedDrive", "recipients", "attachments"})
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
    @Builder.Default
    @Column(name = "target_audience", nullable = false, length = 50)
    private TargetAudience targetAudience = TargetAudience.ALL;

    @NotNull(message = "Creating user is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "created_by",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notifications_creator")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "related_job_id",
        foreignKey = @ForeignKey(name = "fk_notifications_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job relatedJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "related_drive_id",
        foreignKey = @ForeignKey(name = "fk_notifications_drive")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PlacementDrive relatedDrive;

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
    @JsonIgnore
    private List<NotificationRecipient> recipients = new ArrayList<>();

    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<NotificationAttachment> attachments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.priority == null) {
            this.priority = NotificationPriority.NORMAL;
        }
        if (this.targetAudience == null) {
            this.targetAudience = TargetAudience.ALL;
        }
        if (this.status == null) {
            this.status = NotificationStatus.DRAFT;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
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

    // Helper methods for recipients
    public void addRecipient(User user) {
        NotificationRecipient recipient = NotificationRecipient.builder()
                .notification(this)
                .user(user)
                .isRead(false)
                .build();
        this.recipients.add(recipient);
    }

    public void addAttachment(String fileName, String fileUrl, String fileType, Long fileSize) {
        NotificationAttachment attachment = NotificationAttachment.builder()
                .notification(this)
                .fileName(fileName)
                .fileUrl(fileUrl)
                .fileType(fileType)
                .fileSize(fileSize)
                .build();
        this.attachments.add(attachment);
    }

    // Convenience alias: the column is related_job_id, but "job" reads better at call sites.
    public Job getJob() {
        return relatedJob;
    }

    public void setJob(Job job) {
        this.relatedJob = job;
    }

    /**
     * Per-recipient read state deliberately lives on {@link NotificationRecipient}, not here.
     * A notification is a broadcast to many users, so "is it read?" has no single answer at
     * this level — query notification_recipients for the user you care about instead.
     */
    public boolean isPublished() {
        return NotificationStatus.PUBLISHED.equals(this.status);
    }

    public boolean isExpired() {
        return this.expiresAt != null && this.expiresAt.isBefore(LocalDateTime.now());
    }
}
