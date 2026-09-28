package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    List<Job> findByCompany(Company company);

    List<Job> findByCompanyId(Long companyId);

    @Query("SELECT j FROM Job j WHERE LOWER(j.company.name) = LOWER(:company)")
    List<Job> findByCompanyIgnoreCase(@Param("company") String company);

    List<Job> findByJobType(EmploymentType jobType);

    @Query("SELECT j FROM Job j WHERE j.jobType = :employmentType")
    List<Job> findByEmploymentType(@Param("employmentType") EmploymentType employmentType);

    List<Job> findByPostedById(Long postedById);

    List<Job> findByIsDeletedFalse();

    List<Job> findByStatusAndIsDeletedFalse(JobStatus status);

    List<Job> findByIsActiveTrueAndIsDeletedFalse();
}
