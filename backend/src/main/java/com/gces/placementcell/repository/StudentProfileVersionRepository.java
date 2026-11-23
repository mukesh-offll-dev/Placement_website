package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProfileVersion;
import com.gces.placementcell.entity.enums.ProfileVersionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileVersionRepository extends JpaRepository<StudentProfileVersion, Long>,
        JpaSpecificationExecutor<StudentProfileVersion> {

    Optional<StudentProfileVersion> findFirstByStudentIdAndStatusInOrderByVersionNumberDesc(
            Long studentId, Collection<ProfileVersionStatus> statuses);

    Optional<StudentProfileVersion> findFirstByStudentIdOrderByVersionNumberDesc(Long studentId);

    List<StudentProfileVersion> findByStudentIdOrderByVersionNumberDesc(Long studentId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM StudentProfileVersion v WHERE v.student.id = :studentId")
    int findMaxVersionNumber(@Param("studentId") Long studentId);

    /** Locks the row so two reviewers cannot decide the same request at once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM StudentProfileVersion v WHERE v.id = :id")
    Optional<StudentProfileVersion> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT v.status, COUNT(v) FROM StudentProfileVersion v JOIN v.student s "
            + "WHERE (:code IS NULL OR UPPER(s.departmentCode) = UPPER(:code)) GROUP BY v.status")
    List<Object[]> countByStatusForDepartment(@Param("code") String departmentCode);
}
