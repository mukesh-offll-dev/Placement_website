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

    List<Job> findByStatusAndIsDeletedFalse(JobStatus status);

    List<Job> findByIsActiveTrueAndIsDeletedFalse();

    // -- Paged listings. The entity graph fetches company/postedBy in the same query;
    // collections stay lazy because joining several bags at once is a cartesian product.

    @EntityGraph(attributePaths = {"company", "postedBy"})
    Page<Job> findByIsDeletedFalse(Pageable pageable);

    @EntityGraph(attributePaths = {"company", "postedBy"})
    Page<Job> findByStatusAndIsDeletedFalse(JobStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"company", "postedBy"})
    Page<Job> findByCompanyId(Long companyId, Pageable pageable);

    /** Jobs a student can still apply to: active, not deleted, deadline not passed. */
    @EntityGraph(attributePaths = {"company"})
    @Query("""
            SELECT j FROM Job j
            WHERE j.isDeleted = false
              AND j.isActive = true
              AND j.status = :status
              AND j.applicationDeadline >= :today
            """)
    Page<Job> findOpenJobs(@Param("status") JobStatus status,
                           @Param("today") LocalDate today,
                           Pageable pageable);

    /**
     * Job detail with company, poster and skills. Only one collection is fetched:
     * two List associations in one query throw MultipleBagFetchException.
     */
    @EntityGraph(attributePaths = {"company", "postedBy", "skills"})
    Optional<Job> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"company", "postedBy", "skills"})
    Optional<Job> findWithDetailsByIdAndIsDeletedFalse(Long id);

    long countByStatusAndIsDeletedFalse(JobStatus status);

    long countByIsDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT j.company) FROM Job j WHERE j.isDeleted = false")
    long countDistinctCompanies();
}
