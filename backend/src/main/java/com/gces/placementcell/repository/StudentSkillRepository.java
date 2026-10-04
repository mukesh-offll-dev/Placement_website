package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentSkillRepository extends JpaRepository<StudentSkill, Long> {

    List<StudentSkill> findByStudentProfileId(Long studentProfileId);

    void deleteByStudentProfileId(Long studentProfileId);
}