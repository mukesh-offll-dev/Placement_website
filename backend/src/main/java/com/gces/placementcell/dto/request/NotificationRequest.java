package com.gces.placementcell.dto.request;

import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.TargetAudience;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * An announcement the placement cell broadcasts to a group of users.
 *
 * Read state is per recipient and lives on notification_recipients, so there is no
 * isRead field here or on the response.
 */
public record NotificationRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title cannot exceed 200 characters")
        String title,

        @NotBlank(message = "Message is required")
        @Size(max = 4000, message = "Message cannot exceed 4000 characters")
        String message,

        NotificationType notificationType,

        NotificationPriority priority,

        @NotNull(message = "Target audience is required")
        TargetAudience targetAudience,

        Long relatedJobId,

        Long relatedDriveId,

        /** Null publishes immediately; a future time queues the notification. */
        LocalDateTime scheduledAt,

        LocalDateTime expiresAt,

        /** Only meaningful when targetAudience is SPECIFIC_USERS. */
        List<@NotNull(message = "Recipient id cannot be null") Long> recipientUserIds
) {

    @AssertTrue(message = "Recipient user ids are required when the audience is SPECIFIC_USERS")
    public boolean isRecipientListConsistent() {
        if (targetAudience != TargetAudience.SPECIFIC_USERS) {
            return true;
        }
        return recipientUserIds != null && !recipientUserIds.isEmpty();
    }

    @AssertTrue(message = "Expiry time must be after the scheduled time")
    public boolean isScheduleValid() {
        return scheduledAt == null || expiresAt == null || expiresAt.isAfter(scheduledAt);
    }
}
