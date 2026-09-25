package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentProfile entity.
 */
@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    Optional<StudentProfile> findByUserId(Long userId);

    Optional<StudentProfile> findByRollNo(String rollNo);

    Optional<StudentProfile> findByEmail(String email);

    boolean existsByRollNo(String rollNo);

    boolean existsByUserId(Long userId);

    List<StudentProfile> findByDepartmentCode(String departmentCode);

    List<StudentProfile> findByPlacementStatus(PlacementStatus placementStatus);

    List<StudentProfile> findByIsOpenToOpportunitiesTrue();
}
