package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProject;
import org.springframework.data.jpa.repository.JpaRepository;
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

    void deleteByStudentProfileId(Long studentProfileId);
}
