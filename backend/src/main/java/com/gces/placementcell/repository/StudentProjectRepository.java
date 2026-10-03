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

    List<StudentProject> findByStudentId(Long studentId);

    List<StudentProject> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    Optional<StudentProject> findByStudentIdAndTitle(Long studentId, String title);

    Optional<StudentProject> findByIdAndStudentId(Long id, Long studentId);

    boolean existsByStudentIdAndTitle(Long studentId, String title);

    void deleteByStudentId(Long studentId);
}
