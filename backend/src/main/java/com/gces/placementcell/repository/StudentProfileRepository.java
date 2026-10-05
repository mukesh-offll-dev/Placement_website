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

    List<StudentProfile> findByDepartmentCodeAndCgpaGreaterThanEqual(String departmentCode, BigDecimal minCgpa);

    List<StudentProfile> findByPlacementStatusAndDepartmentCode(PlacementStatus placementStatus, String departmentCode);

    List<StudentProfile> findByCgpaGreaterThanEqual(BigDecimal minCgpa);

    long countByPlacementStatus(PlacementStatus placementStatus);

    long countByIsOpenToOpportunitiesTrue();

    @Query("SELECT s FROM StudentProfile s WHERE " +
           "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.rollNo) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<StudentProfile> searchStudents(@Param("query") String query);

    @Query("SELECT s FROM StudentProfile s WHERE " +
           "(:departmentCode IS NULL OR s.departmentCode = :departmentCode) AND " +
           "(:placementStatus IS NULL OR s.placementStatus = :placementStatus) AND " +
           "(:minCgpa IS NULL OR s.cgpa >= :minCgpa)")
    List<StudentProfile> filterStudents(
            @Param("departmentCode") String departmentCode,
            @Param("placementStatus") PlacementStatus placementStatus,
            @Param("minCgpa") BigDecimal minCgpa
    );

    // -- Paged variants for the student directory, which grows with every intake.

    @Query("SELECT s FROM StudentProfile s WHERE " +
           "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.rollNo) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<StudentProfile> searchStudents(@Param("query") String query, Pageable pageable);

    @Query("SELECT s FROM StudentProfile s WHERE " +
           "(:departmentCode IS NULL OR s.departmentCode = :departmentCode) AND " +
           "(:placementStatus IS NULL OR s.placementStatus = :placementStatus) AND " +
           "(:minCgpa IS NULL OR s.cgpa >= :minCgpa)")
    Page<StudentProfile> filterStudents(
            @Param("departmentCode") String departmentCode,
            @Param("placementStatus") PlacementStatus placementStatus,
            @Param("minCgpa") BigDecimal minCgpa,
            Pageable pageable
    );

    Page<StudentProfile> findByDepartmentCode(String departmentCode, Pageable pageable);

    Page<StudentProfile> findByPlacementStatus(PlacementStatus placementStatus, Pageable pageable);

    /**
     * Profile with its login row. Child bags are not joined: fetching more than one
     * List association in one query throws MultipleBagFetchException.
     */
    @EntityGraph(attributePaths = {"user"})
    Optional<StudentProfile> findWithDetailsByUserId(Long userId);

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL)")
    long countActiveStudents();

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED")
    long countPlacedStudents();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countStudentsGroupedByDepartment();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countPlacedStudentsGroupedByDepartment();
}
