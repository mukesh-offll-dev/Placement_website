package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing downloadable attachments associated with a notification broadcast.
 */
@Entity
@Table(
    name = "notification_attachments",
    indexes = {
        @Index(name = "idx_notification_attachments_notification", columnList = "notification_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"notification"})
@EqualsAndHashCode(of = "id")
public class NotificationAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Notification reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "notification_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notif_attach_notif")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Notification notification;

    @NotBlank(message = "File name is required")
    @Size(max = 255, message = "File name cannot exceed 255 characters")
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @NotBlank(message = "File URL is required")
    @Size(max = 1000, message = "File URL cannot exceed 1000 characters")
    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    @Size(max = 100, message = "File type cannot exceed 100 characters")
    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
