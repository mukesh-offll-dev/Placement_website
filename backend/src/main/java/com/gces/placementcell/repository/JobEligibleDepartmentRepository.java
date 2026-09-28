package com.gces.placementcell.repository;

import com.gces.placementcell.entity.JobEligibleDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for JobEligibleDepartment entity.
 */
@Repository
public interface JobEligibleDepartmentRepository extends JpaRepository<JobEligibleDepartment, Long> {

    List<JobEligibleDepartment> findByJobId(Long jobId);

    List<JobEligibleDepartment> findByDepartmentCode(String departmentCode);

    void deleteByJobId(Long jobId);
}
