package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.response.NotificationResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.entity.NotificationRecipient;
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
        Long userId = findUserId(userEmail);
        Page<NotificationRecipient> page = unreadOnly
                ? recipientRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable)
                : recipientRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PagedResponse.of(page, NotificationResponse::forRecipient);
    }

    @Override
    public long getUnreadCount(String userEmail) {
        return recipientRepository.countByUserIdAndIsReadFalse(findUserId(userEmail));
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(String userEmail, Long id) {
        NotificationRecipient recipient = findRecipientForUser(id, findUserId(userEmail));
        recipient.markAsRead();
        NotificationRecipient saved = recipientRepository.save(recipient);
        return NotificationResponse.forRecipient(saved);
    }

    @Override
    @Transactional
    public NotificationResponse markAsUnread(String userEmail, Long id) {
        NotificationRecipient recipient = findRecipientForUser(id, findUserId(userEmail));
        recipient.setIsRead(false);
        recipient.setReadAt(null);
        NotificationRecipient saved = recipientRepository.save(recipient);
        return NotificationResponse.forRecipient(saved);
    }

    @Override
    @Transactional
    public void markAllAsRead(String userEmail) {
        recipientRepository.markAllAsReadForUser(findUserId(userEmail), LocalDateTime.now());
    }

    @Override
    @Transactional
    public void deleteNotification(String userEmail, Long id) {
        NotificationRecipient recipient = findRecipientForUser(id, findUserId(userEmail));
        recipientRepository.delete(recipient);
    }

    private Long findUserId(String email) {
        return userRepository.findIdByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    private NotificationRecipient findRecipientForUser(Long id, Long userId) {
        return recipientRepository.findByNotificationIdAndUserId(id, userId)
                .or(() -> recipientRepository.findByIdAndUserId(id, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
    }
}
