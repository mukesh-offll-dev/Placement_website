package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Spring Data JPA Repository for Job entity.
 */
@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatus(JobStatus status);

    List<Job> findByStatusAndApplicationDeadlineGreaterThanEqual(JobStatus status, LocalDate deadline);

    List<Job> findByCompanyIgnoreCase(String company);

    List<Job> findByEmploymentType(EmploymentType employmentType);

    List<Job> findByPostedById(Long postedById);

    List<Job> findByIsDeletedFalse();

    List<Job> findByStatusAndIsDeletedFalse(JobStatus status);
}
