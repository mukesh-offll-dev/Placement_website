package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Notification;
import com.gces.placementcell.entity.enums.NotificationStatus;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.TargetAudience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for Notification entity.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n JOIN n.recipients r WHERE r.user.id = :recipientId ORDER BY n.createdAt DESC")
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(@Param("recipientId") Long recipientId);

    @Query("SELECT n FROM Notification n JOIN n.recipients r WHERE r.user.id = :recipientId AND r.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(@Param("recipientId") Long recipientId);

    @Query("SELECT COUNT(r) FROM NotificationRecipient r WHERE r.user.id = :recipientId AND r.isRead = false")
    long countByRecipientIdAndIsReadFalse(@Param("recipientId") Long recipientId);

    @Query("SELECT n FROM Notification n WHERE n.relatedJob.id = :jobId")
    List<Notification> findByJobId(@Param("jobId") Long jobId);

    List<Notification> findByRelatedJobId(Long jobId);

    List<Notification> findByRelatedDriveId(Long driveId);

    List<Notification> findByCreatedById(Long createdById);

    List<Notification> findByStatus(NotificationStatus status);

    List<Notification> findByTargetAudience(TargetAudience targetAudience);

    List<Notification> findByNotificationType(NotificationType notificationType);

    @Query("SELECT n FROM Notification n JOIN n.recipients r WHERE r.user.id = :recipientId AND n.notificationType = :notificationType")
    List<Notification> findByRecipientIdAndNotificationType(@Param("recipientId") Long recipientId, @Param("notificationType") NotificationType notificationType);
}
