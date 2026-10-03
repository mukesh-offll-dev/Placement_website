package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
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
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

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

    // -- Paged variants. The admin student directory grows with every intake, so the
    // unbounded List versions above are only safe for small, known-size filters.

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
     * Profile with its login row, for the profile page header.
     * The education/experience/projects/skills bags are deliberately not joined here:
     * fetching more than one List association in a single query makes Hibernate throw
     * MultipleBagFetchException, so those load through their own repositories.
     */
    @EntityGraph(attributePaths = {"user"})
    Optional<StudentProfile> findWithDetailsByUserId(Long userId);
}
