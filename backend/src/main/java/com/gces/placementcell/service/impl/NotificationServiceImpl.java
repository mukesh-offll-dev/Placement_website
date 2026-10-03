package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.entity.NotificationRecipient;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.NotificationRecipientRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Implementation of {@link NotificationService}.
 * Manages user-specific notification feeds and read/unread states.
 */
@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final UserRepository userRepository;
    private final NotificationRecipientRepository recipientRepository;

    public NotificationServiceImpl(UserRepository userRepository,
                                   NotificationRecipientRepository recipientRepository) {
        this.userRepository = userRepository;
        this.recipientRepository = recipientRepository;
    }

    @Override
    public PagedResponse<NotificationResponse> getMyNotifications(String userEmail, boolean unreadOnly, Pageable pageable) {
        User user = findUserByEmail(userEmail);
        Page<NotificationRecipient> page = unreadOnly
                ? recipientRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId(), pageable)
                : recipientRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        return PagedResponse.of(page, NotificationResponse::forRecipient);
    }

    @Override
    public long getUnreadCount(String userEmail) {
        User user = findUserByEmail(userEmail);
        return recipientRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(String userEmail, Long id) {
        User user = findUserByEmail(userEmail);
        NotificationRecipient recipient = findRecipientForUser(id, user.getId());
        recipient.markAsRead();
        NotificationRecipient saved = recipientRepository.save(recipient);
        return NotificationResponse.forRecipient(saved);
    }

    @Override
    @Transactional
    public NotificationResponse markAsUnread(String userEmail, Long id) {
        User user = findUserByEmail(userEmail);
        NotificationRecipient recipient = findRecipientForUser(id, user.getId());
        recipient.setIsRead(false);
        recipient.setReadAt(null);
        NotificationRecipient saved = recipientRepository.save(recipient);
        return NotificationResponse.forRecipient(saved);
    }

    @Override
    @Transactional
    public void markAllAsRead(String userEmail) {
        User user = findUserByEmail(userEmail);
        recipientRepository.markAllAsReadForUser(user.getId(), LocalDateTime.now());
    }

    @Override
    @Transactional
    public void deleteNotification(String userEmail, Long id) {
        User user = findUserByEmail(userEmail);
        NotificationRecipient recipient = findRecipientForUser(id, user.getId());
        recipientRepository.delete(recipient);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    private NotificationRecipient findRecipientForUser(Long id, Long userId) {
        return recipientRepository.findByNotificationIdAndUserId(id, userId)
                .or(() -> recipientRepository.findByIdAndUserId(id, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
    }
}
