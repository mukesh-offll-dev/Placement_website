package com.gces.placementcell.repository;

import com.gces.placementcell.entity.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for SavedJob entity.
 */
@Repository
public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {

    List<SavedJob> findByStudentProfileId(Long studentProfileId);

    List<SavedJob> findByJobId(Long jobId);

    Optional<SavedJob> findByStudentProfileIdAndJobId(Long studentProfileId, Long jobId);

    boolean existsByStudentProfileIdAndJobId(Long studentProfileId, Long jobId);

    void deleteByStudentProfileIdAndJobId(Long studentProfileId, Long jobId);
}
