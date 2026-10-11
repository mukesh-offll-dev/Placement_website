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

    default List<StudentProject> findByStudentIdOrderByCreatedAtDesc(Long studentId) {
        return findByStudentProfileIdOrderByCreatedAtDesc(studentId);
    }

    Optional<StudentProject> findByStudentProfileIdAndTitle(Long studentProfileId, String title);

    default Optional<StudentProject> findByStudentIdAndTitle(Long studentId, String title) {
        return findByStudentProfileIdAndTitle(studentId, title);
    }

    Optional<StudentProject> findByIdAndStudentProfileId(Long id, Long studentProfileId);

    default Optional<StudentProject> findByIdAndStudentId(Long id, Long studentId) {
        return findByIdAndStudentProfileId(id, studentId);
    }

    boolean existsByStudentProfileIdAndTitle(Long studentProfileId, String title);

    default boolean existsByStudentIdAndTitle(Long studentId, String title) {
        return existsByStudentProfileIdAndTitle(studentId, title);
    }

    List<StudentProject> findByStudentProfileIdAndTitleContainingIgnoreCase(Long studentProfileId, String keyword);

    long countByStudentProfileId(Long studentProfileId);

    void deleteByStudentProfileId(Long studentProfileId);

    @Query("SELECT p FROM StudentProject p JOIN p.techStack pts WHERE LOWER(pts.technology) = LOWER(:technology)")
    List<StudentProject> findByTechnology(@Param("technology") String technology);
}
