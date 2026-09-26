package com.gces.placementcell.repository;

import com.gces.placementcell.entity.NotificationRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for NotificationRecipient entity.
 */
@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {

    List<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<NotificationRecipient> findByUserIdAndIsRead(Long userId, Boolean isRead);

    long countByUserIdAndIsRead(Long userId, Boolean isRead);

    Optional<NotificationRecipient> findByNotificationIdAndUserId(Long notificationId, Long userId);

    void deleteByNotificationId(Long notificationId);
}
