package com.gces.placementcell.repository;

import com.gces.placementcell.entity.ApplicationTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for ApplicationTimeline entity.
 */
@Repository
public interface ApplicationTimelineRepository extends JpaRepository<ApplicationTimeline, Long> {

    List<ApplicationTimeline> findByJobApplicationIdOrderByDisplayOrderAsc(Long jobApplicationId);

    List<ApplicationTimeline> findByJobApplicationIdOrderByCreatedAtAsc(Long jobApplicationId);

    List<ApplicationTimeline> findByJobApplicationId(Long jobApplicationId);

    void deleteByJobApplicationId(Long jobApplicationId);
}
