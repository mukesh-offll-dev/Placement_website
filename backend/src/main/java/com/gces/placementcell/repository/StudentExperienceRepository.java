package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentExperience;
import com.gces.placementcell.entity.enums.ExperienceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for StudentExperience entity.
 */
@Repository
public interface StudentExperienceRepository extends JpaRepository<StudentExperience, Long> {

    List<StudentExperience> findByStudentProfileId(Long studentProfileId);

    List<StudentExperience> findByStudentProfileIdOrderByStartDateDesc(Long studentProfileId);

    List<StudentExperience> findByStudentProfileIdAndExperienceType(Long studentProfileId, ExperienceType experienceType);

    void deleteByStudentProfileId(Long studentProfileId);
}
