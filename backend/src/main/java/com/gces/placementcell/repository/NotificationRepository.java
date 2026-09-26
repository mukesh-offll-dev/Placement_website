package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for Notification entity.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<Notification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndIsReadFalse(Long recipientId);

    List<Notification> findByJobApplicationId(Long jobApplicationId);

    List<Notification> findByJobId(Long jobId);

    List<Notification> findByRecipientIdAndNotificationType(Long recipientId, NotificationType notificationType);
}
