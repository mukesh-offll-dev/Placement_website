package com.gces.placementcell.repository;

import com.gces.placementcell.entity.NotificationAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for NotificationAttachment entity.
 */
@Repository
public interface NotificationAttachmentRepository extends JpaRepository<NotificationAttachment, Long> {

    List<NotificationAttachment> findByNotificationId(Long notificationId);
}
