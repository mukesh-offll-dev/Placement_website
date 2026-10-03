package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.NotificationRecipient;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.TargetAudience;

import java.time.LocalDateTime;

/**
 * A notification in a user's feed.
 *
 * isRead and readAt come from the recipient row, not the notification: a notification is
 * one broadcast row shared by many users, so read state only has meaning per user. Build
 * feed entries with {@link #forRecipient(NotificationRecipient)}, which supplies both.
 */
public record NotificationResponse(
        Long id,
        String title,
        String message,
        NotificationType notificationType,
        NotificationPriority priority,
        TargetAudience targetAudience,
        NotificationStatus status,
        Long relatedJobId,
        String relatedJobRole,
        Long relatedDriveId,
        LocalDateTime scheduledAt,
        LocalDateTime publishedAt,
        LocalDateTime expiresAt,
        Boolean isRead,
        LocalDateTime readAt,
        LocalDateTime createdAt
) {

    /**
     * The notification itself, with no read state — for the placement cell's management
     * view, where a single broadcast has many recipients.
     */
    public static NotificationResponse from(Notification notification) {
        return build(notification, null, null);
    }

    /**
     * One row of a user's feed: the notification plus that user's own read state.
     * Pair with the paged NotificationRecipientRepository queries, whose entity graph
     * already fetches the notification and its related job.
     */
    public static NotificationResponse forRecipient(NotificationRecipient recipient) {
        if (recipient == null) {
            return null;
        }
        return build(recipient.getNotification(), recipient.getIsRead(), recipient.getReadAt());
    }

    private static NotificationResponse build(
            Notification notification, Boolean isRead, LocalDateTime readAt) {
        if (notification == null) {
            return null;
        }
        var job = notification.getRelatedJob();
        var drive = notification.getRelatedDrive();
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getNotificationType(),
                notification.getPriority(),
                notification.getTargetAudience(),
                notification.getStatus(),
                job == null ? null : job.getId(),
                job == null ? null : job.getJobRole(),
                drive == null ? null : drive.getId(),
                notification.getScheduledAt(),
                notification.getPublishedAt(),
                notification.getExpiresAt(),
                isRead,
                readAt,
                notification.getCreatedAt()
        );
    }
}
