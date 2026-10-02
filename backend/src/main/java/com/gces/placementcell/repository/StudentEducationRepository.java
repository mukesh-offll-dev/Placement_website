package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentEducation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for StudentEducation entity.
 */
@Repository
public interface StudentEducationRepository extends JpaRepository<StudentEducation, Long> {

    List<StudentEducation> findByStudentProfileId(Long studentProfileId);

    List<StudentEducation> findByStudentProfileIdOrderByStartYearDesc(Long studentProfileId);

    void deleteByStudentProfileId(Long studentProfileId);
}
