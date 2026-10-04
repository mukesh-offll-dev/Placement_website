package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobSelectionRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for JobSelectionRound entity.
 */
@Repository
public interface JobSelectionRoundRepository extends JpaRepository<JobSelectionRound, Long> {

    List<JobSelectionRound> findByJobIdOrderByRoundNumberAsc(Long jobId);

    Optional<JobSelectionRound> findByJobIdAndRoundNumber(Long jobId, Short roundNumber);

    void deleteByJobId(Long jobId);
}
