package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobEligibleDegree;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for JobEligibleDegree entity.
 */
@Repository
public interface JobEligibleDegreeRepository extends JpaRepository<JobEligibleDegree, Long> {

    List<JobEligibleDegree> findByJobId(Long jobId);

    List<JobEligibleDegree> findByDegree(String degree);

    void deleteByJobId(Long jobId);
}
