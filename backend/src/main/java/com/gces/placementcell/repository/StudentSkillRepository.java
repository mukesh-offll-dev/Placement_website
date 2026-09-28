package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentSkill entity.
 */
@Repository
public interface StudentSkillRepository extends JpaRepository<StudentSkill, Long> {

    List<StudentSkill> findByStudentProfileId(Long studentProfileId);

    List<StudentSkill> findByStudentProfileIdOrderBySkillNameAsc(Long studentProfileId);

    List<StudentSkill> findBySkillNameIgnoreCase(String skillName);

    Optional<StudentSkill> findByStudentProfileIdAndSkillNameIgnoreCase(Long studentProfileId, String skillName);

    boolean existsByStudentProfileIdAndSkillNameIgnoreCase(Long studentProfileId, String skillName);

    void deleteByStudentProfileId(Long studentProfileId);

    void deleteByStudentProfileIdAndSkillNameIgnoreCase(Long studentProfileId, String skillName);

    @Query("SELECT DISTINCT s.skillName FROM StudentSkill s ORDER BY s.skillName ASC")
    List<String> findDistinctSkillNames();

    @Query("SELECT s.studentProfile.id FROM StudentSkill s WHERE LOWER(s.skillName) = LOWER(:skillName)")
    List<Long> findStudentProfileIdsBySkillName(@Param("skillName") String skillName);
}
