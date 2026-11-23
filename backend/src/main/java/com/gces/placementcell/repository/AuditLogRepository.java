package com.gces.placementcell.repository;

import com.gces.placementcell.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE (:action IS NULL OR a.action = :action) "
            + "AND (:entityType IS NULL OR a.entityType = :entityType)")
    Page<AuditLog> search(@Param("action") String action, @Param("entityType") String entityType, Pageable pageable);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByIdAsc(String entityType, Long entityId);
}
