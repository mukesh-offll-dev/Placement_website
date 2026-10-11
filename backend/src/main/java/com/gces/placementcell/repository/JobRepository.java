package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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

    Page<Job> findByIsDeletedFalse(Pageable pageable);

    List<Job> findByStatusAndIsDeletedFalse(JobStatus status);

    Page<Job> findByStatusAndIsDeletedFalse(JobStatus status, Pageable pageable);

    Page<Job> findByCompanyId(Long companyId, Pageable pageable);

    @Query("SELECT j FROM Job j WHERE j.status = :status AND j.applicationDeadline >= :deadline AND j.isDeleted = false")
    Page<Job> findOpenJobs(@Param("status") JobStatus status, @Param("deadline") LocalDate deadline, Pageable pageable);

    default Optional<Job> findWithDetailsById(Long id) {
        return findById(id);
    }

    default Optional<Job> findWithDetailsByIdAndIsDeletedFalse(Long id) {
        return findById(id).filter(j -> !Boolean.TRUE.equals(j.getIsDeleted()));
    }

    long countByStatusAndIsDeletedFalse(JobStatus status);

    long countByIsDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT j.company) FROM Job j WHERE j.isDeleted = false")
    long countDistinctCompanies();
}
