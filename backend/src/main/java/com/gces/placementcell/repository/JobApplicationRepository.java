package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobApplication;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
