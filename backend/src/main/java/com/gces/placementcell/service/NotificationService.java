package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for notification operations.
 */
public interface NotificationService {

    /**
     * Retrieves notifications for the currently logged-in user.
     *
     * @param userEmail email of the logged-in user
     * @param unreadOnly whether to return only unread notifications
     * @param pageable pagination parameters
     * @return paged list of NotificationResponse items
     */
    PagedResponse<NotificationResponse> getMyNotifications(String userEmail, boolean unreadOnly, Pageable pageable);

    /**
     * Gets the unread notification count for the logged-in user.
     *
     * @param userEmail email of the logged-in user
     * @return unread notification count
     */
    long getUnreadCount(String userEmail);

    /**
     * Marks a specific notification as read for the logged-in user.
     *
     * @param userEmail email of the logged-in user
     * @param id ID of the notification or notification recipient
     * @return updated NotificationResponse
     */
    NotificationResponse markAsRead(String userEmail, Long id);

    /**
     * Marks a specific notification as unread for the logged-in user.
     *
     * @param userEmail email of the logged-in user
     * @param id ID of the notification or notification recipient
     * @return updated NotificationResponse
     */
    NotificationResponse markAsUnread(String userEmail, Long id);

    /**
     * Marks all notifications as read for the logged-in user.
     *
     * @param userEmail email of the logged-in user
     */
    void markAllAsRead(String userEmail);

    /**
     * Deletes a notification from the logged-in user's feed.
     *
     * @param userEmail email of the logged-in user
     * @param id ID of the notification or notification recipient
     */
    void deleteNotification(String userEmail, Long id);
}
