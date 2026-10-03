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

    // -- Paged listings.
    // Job has nine LAZY collections plus LAZY company/postedBy, so any listing that
    // renders the company name triggers N+1 without an explicit fetch. The entity
    // graph collapses that into a single join; the collections stay lazy on purpose
    // (fetching several bags at once would produce a cartesian product).

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
     * Single job with its company, poster and skill rows, for a detail view.
     * Only one collection is fetched here on purpose: joining two List (bag)
     * associations in one query makes Hibernate throw MultipleBagFetchException,
     * so the remaining child rows load through their own repositories.
     */
    @EntityGraph(attributePaths = {"company", "postedBy", "skills"})
    Optional<Job> findWithDetailsById(Long id);

    long countByStatusAndIsDeletedFalse(JobStatus status);
}
