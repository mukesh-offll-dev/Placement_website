package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobResponsibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for JobResponsibility entity.
 */
@Repository
public interface JobResponsibilityRepository extends JpaRepository<JobResponsibility, Long> {

    List<JobResponsibility> findByJobIdOrderByDisplayOrderAsc(Long jobId);

    void deleteByJobId(Long jobId);
}
