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

    List<JobApplication> findByStudentProfileId(Long studentProfileId);

    List<JobApplication> findByStudentProfileUserId(Long userId);

    Optional<JobApplication> findByJobIdAndStudentProfileId(Long jobId, Long studentProfileId);

    boolean existsByJobIdAndStudentProfileId(Long jobId, Long studentProfileId);

    boolean existsByStudentProfileIdAndResumeUrlEndingWith(Long studentProfileId, String suffix);

    List<JobApplication> findByStatus(ApplicationStatus status);

    List<JobApplication> findByStudentProfileIdAndStatus(Long studentProfileId, ApplicationStatus status);

    long countByJobId(Long jobId);

    long countByJobIdAndStatus(Long jobId, ApplicationStatus status);

    long countByStudentProfileId(Long studentProfileId);

    long countByStatus(ApplicationStatus status);

    // The mapped attribute is appliedOn; getAppliedAt() is only a Java alias and
    // is invisible to Spring Data's query derivation.
    long countByAppliedOnGreaterThanEqual(java.time.LocalDateTime since);

    List<JobApplication> findTop10ByOrderByAppliedOnDesc();

    /** Recent applications with student, job and company loaded in the same query (dashboard). */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"studentProfile", "job", "job.company"})
    List<JobApplication> findTop10ByOrderByAppliedOnDescIdDesc();

    /** Students with at least one SELECTED application (a student with two offers counts once). */
    @Query("SELECT COUNT(DISTINCT a.studentProfile.id) FROM JobApplication a WHERE a.status = :status")
    long countDistinctStudentsByStatus(@Param("status") ApplicationStatus status);

    // -- Paged views with their joins pre-fetched, so listing pages cost one query.

    @EntityGraph(attributePaths = {"studentProfile", "job", "job.company", "reviewedBy", "currentRound"})
    Page<JobApplication> findByJobId(Long jobId, Pageable pageable);

    @EntityGraph(attributePaths = {"job", "job.company", "reviewedBy", "currentRound"})
    Page<JobApplication> findByStudentProfileId(Long studentProfileId, Pageable pageable);

    @EntityGraph(attributePaths = {"studentProfile", "job", "job.company", "reviewedBy", "currentRound"})
    Page<JobApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    /** Admin application list; every filter is optional. */
    @EntityGraph(attributePaths = {"studentProfile", "job", "job.company", "reviewedBy", "currentRound"})
    @Query("""
            SELECT a FROM JobApplication a
            WHERE (:jobId IS NULL OR a.job.id = :jobId)
              AND (:status IS NULL OR a.status = :status)
              AND (:studentId IS NULL OR a.studentProfile.id = :studentId)
            """)
    Page<JobApplication> findForAdmin(@Param("jobId") Long jobId,
                                      @Param("status") ApplicationStatus status,
                                      @Param("studentId") Long studentId,
                                      Pageable pageable);

    /** Application detail with its timeline; timeline is the only bag fetched. */
    @EntityGraph(attributePaths = {
            "job", "job.company", "studentProfile", "timeline", "reviewedBy", "currentRound"
    })
    Optional<JobApplication> findWithTimelineById(Long id);

    /** Per-status counts for one job in a single grouped query. */
    @Query("""
            SELECT a.status, COUNT(a)
            FROM JobApplication a
            WHERE a.job.id = :jobId
            GROUP BY a.status
            """)
    List<Object[]> countGroupedByStatusForJob(@Param("jobId") Long jobId);
}
