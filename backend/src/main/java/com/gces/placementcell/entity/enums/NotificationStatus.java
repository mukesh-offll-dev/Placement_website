package com.gces.placementcell.entity.enums;

/**
 * Notification lifecycle status.
 * Corresponds to chk_notifications_status in DB schema.
 */
public enum NotificationStatus {
    DRAFT,
    SCHEDULED,
    PUBLISHED,
    EXPIRED,
    ARCHIVED
}
