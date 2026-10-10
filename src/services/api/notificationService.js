import axiosClient from './axiosClient.js';

/**
 * Notification API Service
 * Maps to backend NotificationController (/api/notifications/**)
 */

/**
 * Get paged notifications for the logged-in user.
 * GET /api/notifications?page=0&size=20&unreadOnly=false
 *
 * @param {Object} [params]
 * @param {number} [params.page=0]
 * @param {number} [params.size=50]
 * @param {boolean} [params.unreadOnly=false]
 * @returns {Promise<Object>} PagedResponse<NotificationResponse>
 */
export const getNotifications = async ({ page = 0, size = 50, unreadOnly = false } = {}) => {
  const response = await axiosClient.get('/notifications', {
    params: { page, size, unreadOnly },
  });
  return response.data;
};

/**
 * Get unread notification count for the logged-in user.
 * GET /api/notifications/unread-count
 *
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async () => {
  const response = await axiosClient.get('/notifications/unread-count');
  return response.data;
};

/**
 * Mark a notification as read.
 * PATCH /api/notifications/{id}/read
 *
 * @param {number|string} id Notification ID
 * @returns {Promise<Object>} Updated NotificationResponse
 */
export const markAsRead = async (id) => {
  const response = await axiosClient.patch(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark a notification as unread.
 * PATCH /api/notifications/{id}/unread
 *
 * @param {number|string} id Notification ID
 * @returns {Promise<Object>} Updated NotificationResponse
 */
export const markAsUnread = async (id) => {
  const response = await axiosClient.patch(`/notifications/${id}/unread`);
  return response.data;
};

/**
 * Mark all notifications as read for current user.
 * PATCH /api/notifications/read-all
 *
 * @returns {Promise<void>}
 */
export const markAllAsRead = async () => {
  const response = await axiosClient.patch('/notifications/read-all');
  return response.data;
};

/**
 * Delete a notification from the current user's feed.
 * DELETE /api/notifications/{id}
 *
 * @param {number|string} id Notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (id) => {
  const response = await axiosClient.delete(`/notifications/${id}`);
  return response.data;
};

const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
