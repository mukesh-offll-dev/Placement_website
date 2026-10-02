package com.gces.placementcell.repository;

import com.gces.placementcell.entity.ProjectTechStack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for ProjectTechStack entity.
 */
@Repository
public interface ProjectTechStackRepository extends JpaRepository<ProjectTechStack, Long> {

    List<ProjectTechStack> findByProjectId(Long projectId);

    List<ProjectTechStack> findByTechnologyIgnoreCase(String technology);

    void deleteByProjectId(Long projectId);
}
