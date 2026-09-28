package com.gces.placementcell.repository;

import com.gces.placementcell.entity.ApplicationTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for ApplicationTimeline entity.
 */
@Repository
public interface ApplicationTimelineRepository extends JpaRepository<ApplicationTimeline, Long> {

    List<ApplicationTimeline> findByJobApplicationIdOrderByDisplayOrderAsc(Long jobApplicationId);

    @Query("SELECT t FROM ApplicationTimeline t WHERE t.jobApplication.id = :jobApplicationId ORDER BY t.createdAt ASC")
    List<ApplicationTimeline> findByJobApplicationIdOrderByChangedAtAsc(@Param("jobApplicationId") Long jobApplicationId);

    List<ApplicationTimeline> findByJobApplicationIdOrderByCreatedAtAsc(Long jobApplicationId);

    List<ApplicationTimeline> findByJobApplicationId(Long jobApplicationId);

    void deleteByJobApplicationId(Long jobApplicationId);
}
