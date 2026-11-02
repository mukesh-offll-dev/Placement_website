package com.gces.placementcell.service;

import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;

import java.util.Collection;

/**
 * Asks {@link NotificationDispatcher} to put one notification in each recipient's in-app feed
 * and, when {@code sendEmail} is set, to email the same text to them.
 *
 * Carries ids and plain text only, so it is safe to hand to another thread after the
 * publishing transaction has committed.
 *
 * @param linkPath app route the notification points at (e.g. "/student/jobs/7"), or null
 */
public record UserNotificationEvent(
        Collection<Long> recipientUserIds,
        Long createdByUserId,
        String title,
        String message,
        NotificationType type,
        NotificationPriority priority,
        Long relatedJobId,
        String linkPath,
        boolean sendEmail) {

    public static UserNotificationEvent of(Collection<Long> recipientUserIds, Long createdByUserId,
                                           String title, String message, NotificationType type,
                                           Long relatedJobId, String linkPath) {
        return new UserNotificationEvent(recipientUserIds, createdByUserId, title, message, type,
                NotificationPriority.NORMAL, relatedJobId, linkPath, true);
    }
}
