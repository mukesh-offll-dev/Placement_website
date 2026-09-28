package com.gces.placementcell.repository;

import com.gces.placementcell.entity.ProjectTechStack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for ProjectTechStack entity.
 */
@Repository
public interface ProjectTechStackRepository extends JpaRepository<ProjectTechStack, Long> {

    List<ProjectTechStack> findByProjectId(Long projectId);

    List<ProjectTechStack> findByTechnologyIgnoreCase(String technology);

    boolean existsByProjectIdAndTechnologyIgnoreCase(Long projectId, String technology);

    void deleteByProjectId(Long projectId);

    void deleteByProjectIdAndTechnologyIgnoreCase(Long projectId, String technology);

    @Query("SELECT DISTINCT pts.technology FROM ProjectTechStack pts ORDER BY pts.technology ASC")
    List<String> findDistinctTechnologies();
}
