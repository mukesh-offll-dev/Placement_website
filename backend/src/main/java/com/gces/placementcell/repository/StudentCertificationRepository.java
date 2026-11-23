package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentCertification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentCertificationRepository extends JpaRepository<StudentCertification, Long> {

    List<StudentCertification> findByStudentProfileIdOrderByIdAsc(Long studentProfileId);

    boolean existsByStudentProfileIdAndFileUrlEndingWith(Long studentProfileId, String suffix);
}
