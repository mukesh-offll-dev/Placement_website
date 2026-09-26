package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.enums.NotificationAudience;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for Notification entity.
 *
 * Per-user read state is not here: a notification is a broadcast, so
 * "my notifications" and unread counts come from NotificationRecipientRepository.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByIsDeletedFalseOrderByCreatedAtDesc();

    List<Notification> findByStatusOrderByPublishedAtDesc(NotificationStatus status);

    List<Notification> findByTargetAudienceAndStatus(NotificationAudience targetAudience, NotificationStatus status);

    List<Notification> findByNotificationType(NotificationType notificationType);

    List<Notification> findByRelatedJobId(Long relatedJobId);

    List<Notification> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);
}
