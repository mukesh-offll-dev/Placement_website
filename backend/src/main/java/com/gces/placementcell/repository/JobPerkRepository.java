package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobPerk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for JobPerk entity.
 */
@Repository
public interface JobPerkRepository extends JpaRepository<JobPerk, Long> {

    List<JobPerk> findByJobId(Long jobId);

    void deleteByJobId(Long jobId);
}
