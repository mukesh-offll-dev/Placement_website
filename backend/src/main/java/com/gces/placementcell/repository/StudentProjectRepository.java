package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentProject entity.
 */
@Repository
public interface StudentProjectRepository extends JpaRepository<StudentProject, Long> {

    List<StudentProject> findByStudentProfileId(Long studentProfileId);

    List<StudentProject> findByStudentProfileIdOrderByCreatedAtDesc(Long studentProfileId);

    Optional<StudentProject> findByStudentProfileIdAndTitle(Long studentProfileId, String title);

    boolean existsByStudentProfileIdAndTitle(Long studentProfileId, String title);

    List<StudentProject> findByStudentProfileIdAndTitleContainingIgnoreCase(Long studentProfileId, String keyword);

    long countByStudentProfileId(Long studentProfileId);

    Optional<StudentProject> findByIdAndStudentProfileId(Long id, Long studentProfileId);

    boolean existsByIdAndStudentProfileId(Long id, Long studentProfileId);

    void deleteByIdAndStudentProfileId(Long id, Long studentProfileId);

    @Query("SELECT p FROM StudentProject p JOIN ProjectTechStack pts ON pts.project = p WHERE LOWER(pts.technology) = LOWER(:technology)")
    List<StudentProject> findByTechnology(@Param("technology") String technology);
}
