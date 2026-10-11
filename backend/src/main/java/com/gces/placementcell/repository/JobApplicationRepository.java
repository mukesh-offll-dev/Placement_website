package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for JobApplication entity.
 */
@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByJobId(Long jobId);

    Page<JobApplication> findByJobId(Long jobId, Pageable pageable);

    List<JobApplication> findByStudentProfileId(Long studentProfileId);

    Page<JobApplication> findByStudentProfileId(Long studentProfileId, Pageable pageable);

    List<JobApplication> findByStudentProfileUserId(Long userId);

    Optional<JobApplication> findByJobIdAndStudentProfileId(Long jobId, Long studentProfileId);

    boolean existsByJobIdAndStudentProfileId(Long jobId, Long studentProfileId);

    List<JobApplication> findByStatus(ApplicationStatus status);

    Page<JobApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    @Query("SELECT a FROM JobApplication a WHERE (:jobId IS NULL OR a.job.id = :jobId) AND (:status IS NULL OR a.status = :status)")
    Page<JobApplication> findForAdmin(@Param("jobId") Long jobId, @Param("status") ApplicationStatus status, Pageable pageable);

    default Optional<JobApplication> findWithTimelineById(Long id) {
        return findById(id);
    }

    @Query("SELECT a.status AS status, COUNT(a) AS count FROM JobApplication a WHERE a.job.id = :jobId GROUP BY a.status")
    List<Object[]> countGroupedByStatusForJobRaw(@Param("jobId") Long jobId);

    default Object countGroupedByStatusForJob(Long jobId) {
        return countGroupedByStatusForJobRaw(jobId);
    }

    List<JobApplication> findByStudentProfileIdAndStatus(Long studentProfileId, ApplicationStatus status);

    long countByJobId(Long jobId);

    long countByJobIdAndStatus(Long jobId, ApplicationStatus status);

    long countByStatus(ApplicationStatus status);

    long countByStudentProfileId(Long studentProfileId);

    long countByAppliedOnGreaterThanEqual(java.time.LocalDateTime since);

    default long countByAppliedAtGreaterThanEqual(java.time.LocalDateTime since) {
        return countByAppliedOnGreaterThanEqual(since);
    }

    List<JobApplication> findTop10ByOrderByAppliedOnDesc();

    default List<JobApplication> findTop10ByOrderByAppliedAtDesc() {
        return findTop10ByOrderByAppliedOnDesc();
    }
}
