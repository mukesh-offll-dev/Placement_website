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

    List<JobApplication> findByStatus(ApplicationStatus status);

    List<JobApplication> findByStudentProfileIdAndStatus(Long studentProfileId, ApplicationStatus status);

    long countByJobId(Long jobId);

    long countByJobIdAndStatus(Long jobId, ApplicationStatus status);

    long countByStudentProfileId(Long studentProfileId);

    // -- Paged listings with the associations the screens actually render, so that
    // an applicant list or "my applications" page is one query rather than N+1.

    @EntityGraph(attributePaths = {"studentProfile", "job", "job.company"})
    Page<JobApplication> findByJobId(Long jobId, Pageable pageable);

    @EntityGraph(attributePaths = {"job", "job.company"})
    Page<JobApplication> findByStudentProfileId(Long studentProfileId, Pageable pageable);

    @EntityGraph(attributePaths = {"studentProfile", "job", "job.company"})
    Page<JobApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    /** Application with its full timeline, for the student-facing status view. */
    @EntityGraph(attributePaths = {"job", "job.company", "studentProfile", "timeline"})
    Optional<JobApplication> findWithTimelineById(Long id);

    /** Status breakdown for a job, as one grouped query instead of one count per status. */
    @Query("""
            SELECT a.status, COUNT(a)
            FROM JobApplication a
            WHERE a.job.id = :jobId
            GROUP BY a.status
            """)
    List<Object[]> countGroupedByStatusForJob(@Param("jobId") Long jobId);
}
