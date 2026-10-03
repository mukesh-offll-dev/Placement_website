package com.gces.placementcell.repository;

import com.gces.placementcell.entity.NotificationRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for NotificationRecipient entity.
 */
@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {

    List<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<NotificationRecipient> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    Optional<NotificationRecipient> findByNotificationIdAndUserId(Long notificationId, Long userId);

    Optional<NotificationRecipient> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndIsReadFalse(Long userId);

    List<NotificationRecipient> findByNotificationId(Long notificationId);

    // -- Paged feed. The notification body is on the parent row, so fetch it with the
    // delivery record or every feed page costs one extra query per item.

    @EntityGraph(attributePaths = {"notification", "notification.relatedJob"})
    Page<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"notification", "notification.relatedJob"})
    Page<NotificationRecipient> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Marks a user's unread notifications as read in one statement.
     * Bulk updates bypass the persistence context, so callers must not rely on
     * already-loaded NotificationRecipient instances afterwards.
     */
    @Modifying
    @Query("""
            UPDATE NotificationRecipient r
            SET r.isRead = true, r.readAt = :readAt
            WHERE r.user.id = :userId AND r.isRead = false
            """)
    int markAllAsReadForUser(@Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);
}
