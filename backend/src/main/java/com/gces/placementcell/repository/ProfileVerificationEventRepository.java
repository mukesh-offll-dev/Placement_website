package com.gces.placementcell.repository;

import com.gces.placementcell.entity.ProfileVerificationEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfileVerificationEventRepository extends JpaRepository<ProfileVerificationEvent, Long> {

    @EntityGraph(attributePaths = {"actor"})
    List<ProfileVerificationEvent> findByVersionIdOrderByCreatedAtAscIdAsc(Long versionId);

    /** Latest events for students of one department (decisions and submissions). */
    @EntityGraph(attributePaths = {"actor", "version", "version.student"})
    @Query("SELECT e FROM ProfileVerificationEvent e JOIN e.version v JOIN v.student s "
            + "WHERE UPPER(s.departmentCode) = UPPER(:code) "
            + "AND e.action IN (com.gces.placementcell.entity.enums.VerificationAction.SUBMITTED, "
            + "com.gces.placementcell.entity.enums.VerificationAction.WITHDRAWN, "
            + "com.gces.placementcell.entity.enums.VerificationAction.APPROVED, "
            + "com.gces.placementcell.entity.enums.VerificationAction.REJECTED) "
            + "ORDER BY e.createdAt DESC, e.id DESC")
    List<ProfileVerificationEvent> findRecentForDepartment(@Param("code") String departmentCode, Pageable pageable);
}
