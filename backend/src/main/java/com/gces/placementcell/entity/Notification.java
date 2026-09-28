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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "created_by",
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

    // Backward-compatibility transient reference
    @Transient
    private JobApplication jobApplication;

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

    // Convenience & backward-compatibility aliases
    public Job getJob() {
        return relatedJob;
    }

    public void setJob(Job job) {
        this.relatedJob = job;
    }

    public JobApplication getApplication() {
        return jobApplication;
    }

    public void setApplication(JobApplication application) {
        this.jobApplication = application;
    }

    public User getRecipient() {
        return !recipients.isEmpty() ? recipients.get(0).getUser() : null;
    }

    public User getUser() {
        return getRecipient();
    }

    public void setUser(User user) {
        if (!recipients.isEmpty()) {
            recipients.get(0).setUser(user);
        } else {
            addRecipient(user);
        }
    }

    public Boolean getIsRead() {
        return !recipients.isEmpty() ? recipients.get(0).getIsRead() : false;
    }

    public LocalDateTime getReadAt() {
        return !recipients.isEmpty() ? recipients.get(0).getReadAt() : null;
    }

    public void markAsRead() {
        if (!recipients.isEmpty()) {
            recipients.get(0).markAsRead();
        }
    }

    // Custom builder helpers for backward compatibility
    public static class NotificationBuilder {
        private User singleRecipient;
        private JobApplication singleApplication;
        private Job singleJob;

        public NotificationBuilder recipient(User user) {
            this.singleRecipient = user;
            return this;
        }

        public NotificationBuilder job(Job job) {
            this.singleJob = job;
            return this;
        }

        public NotificationBuilder jobApplication(JobApplication application) {
            this.singleApplication = application;
            return this;
        }

        public Notification build() {
            Notification notification = new Notification();
            notification.id = this.id;
            notification.title = this.title;
            notification.message = this.message;
            notification.notificationType = this.notificationType$set ? this.notificationType$value : NotificationType.GENERAL;
            notification.priority = this.priority$set ? this.priority$value : NotificationPriority.NORMAL;
            notification.targetAudience = this.targetAudience$set ? this.targetAudience$value : TargetAudience.ALL;
            notification.createdBy = this.createdBy;
            notification.relatedJob = this.relatedJob != null ? this.relatedJob : this.singleJob;
            notification.relatedDrive = this.relatedDrive;
            notification.status = this.status$set ? this.status$value : NotificationStatus.DRAFT;
            notification.scheduledAt = this.scheduledAt;
            notification.publishedAt = this.publishedAt;
            notification.expiresAt = this.expiresAt;
            notification.createdAt = this.createdAt;
            notification.updatedAt = this.updatedAt;
            notification.deletedAt = this.deletedAt;
            notification.isDeleted = this.isDeleted$set ? this.isDeleted$value : false;
            notification.recipients = this.recipients$set ? this.recipients$value : new ArrayList<>();
            notification.attachments = this.attachments$set ? this.attachments$value : new ArrayList<>();
            notification.jobApplication = this.singleApplication;

            if (this.singleRecipient != null) {
                notification.addRecipient(this.singleRecipient);
            }
            return notification;
        }
    }
}
