package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for JobRequirement entity.
 */
@Repository
public interface JobRequirementRepository extends JpaRepository<JobRequirement, Long> {

    List<JobRequirement> findByJobIdOrderByDisplayOrderAsc(Long jobId);

    void deleteByJobId(Long jobId);
}
