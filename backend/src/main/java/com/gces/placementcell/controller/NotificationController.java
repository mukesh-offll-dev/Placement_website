package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authenticated notification operations.
 * Path: /api/notifications
 * Requires authentication for all endpoints.
 */
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * GET /api/notifications
     * Fetches paged notifications for the logged-in user.
     *
     * @param page page number (0-indexed, default 0)
     * @param size page size (default 20)
     * @param unreadOnly if true, filters to only unread notifications
     * @param userDetails authenticated user details
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<NotificationResponse>>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @AuthenticationPrincipal UserDetails userDetails) {
        Pageable pageable = PageRequest.of(page, size);
        PagedResponse<NotificationResponse> response = notificationService.getMyNotifications(
                userDetails.getUsername(), unreadOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/notifications/unread-count
     * Gets the count of unread notifications for the logged-in user.
     *
     * @param userDetails authenticated user details
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.getUnreadCount(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    /**
     * PATCH/PUT /api/notifications/{id}/read
     * Marks a notification as read for the logged-in user.
     *
     * @param id notification or recipient ID
     * @param userDetails authenticated user details
     */
    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        NotificationResponse response = notificationService.markAsRead(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", response));
    }

    /**
     * PATCH/PUT /api/notifications/{id}/unread
     * Marks a notification as unread for the logged-in user.
     *
     * @param id notification or recipient ID
     * @param userDetails authenticated user details
     */
    @RequestMapping(value = "/{id}/unread", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsUnread(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        NotificationResponse response = notificationService.markAsUnread(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as unread", response));
    }

    /**
     * PATCH/PUT /api/notifications/read-all
     * Marks all notifications as read for the logged-in user.
     *
     * @param userDetails authenticated user details
     */
    @RequestMapping(value = "/read-all", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    /**
     * DELETE /api/notifications/{id}
     * Deletes a notification from the logged-in user's feed.
     *
     * @param id notification or recipient ID
     * @param userDetails authenticated user details
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.deleteNotification(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted successfully"));
    }
}
