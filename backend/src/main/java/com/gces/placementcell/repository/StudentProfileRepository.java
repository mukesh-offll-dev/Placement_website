package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentProfile entity.
 */
@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long>, JpaSpecificationExecutor<StudentProfile> {

    Optional<StudentProfile> findByUserId(Long userId);

    Optional<StudentProfile> findByRollNo(String rollNo);

    Optional<StudentProfile> findByEmail(String email);

    boolean existsByRollNo(String rollNo);

    boolean existsByEmail(String email);

    boolean existsByUserId(Long userId);

    List<StudentProfile> findByDepartmentCode(String departmentCode);

    List<StudentProfile> findByPlacementStatus(PlacementStatus placementStatus);

    List<StudentProfile> findByIsOpenToOpportunitiesTrue();

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL)")
    long countActiveStudents();

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED")
    long countPlacedStudents();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countStudentsGroupedByDepartment();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countPlacedStudentsGroupedByDepartment();
}
