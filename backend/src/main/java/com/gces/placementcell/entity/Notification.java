package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.NotificationType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing notifications sent to users (students, officers, recruiters).
 * May optionally be associated with a Job Application or Job.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_recipient", columnList = "recipient_id"),
        @Index(name = "idx_notifications_recipient_read", columnList = "recipient_id, is_read"),
        @Index(name = "idx_notifications_application", columnList = "application_id"),
        @Index(name = "idx_notifications_job", columnList = "job_id"),
        @Index(name = "idx_notifications_created_at", columnList = "created_at"),
        @Index(name = "idx_notifications_type", columnList = "notification_type")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Recipient user reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "recipient_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notifications_recipient")
    )
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "application_id",
        foreignKey = @ForeignKey(name = "fk_notifications_application")
    )
    private JobApplication jobApplication;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        foreignKey = @ForeignKey(name = "fk_notifications_job")
    )
    private Job job;

    @NotBlank(message = "Notification title is required")
    @Size(max = 200, message = "Notification title cannot exceed 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @NotBlank(message = "Notification message is required")
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @NotNull(message = "Notification type is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "notification_type", nullable = false, length = 50)
    private NotificationType notificationType = NotificationType.GENERAL;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

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
        if (this.notificationType == null) {
            this.notificationType = NotificationType.GENERAL;
        }
    }

    // Helper convenience methods
    public User getUser() {
        return recipient;
    }

    public void setUser(User user) {
        this.recipient = user;
    }

    public JobApplication getApplication() {
        return jobApplication;
    }

    public void setApplication(JobApplication jobApplication) {
        this.jobApplication = jobApplication;
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
