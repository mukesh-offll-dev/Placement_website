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
import java.util.Collection;
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

    /**
     * Students who can be sent job alerts: a live login, an email on file, open to
     * opportunities and in one of the given placement statuses. Job-specific rules
     * (CGPA, backlogs, batch, department) are applied afterwards by JobEligibility.
     */
    @Query("SELECT s FROM StudentProfile s JOIN FETCH s.user u WHERE u.isDeleted = false AND u.isActive = true " +
           "AND s.email IS NOT NULL AND (s.isOpenToOpportunities IS NULL OR s.isOpenToOpportunities = true) " +
           "AND (s.placementStatus IS NULL OR s.placementStatus IN :statuses)")
    List<StudentProfile> findNotifiableStudents(@Param("statuses") Collection<PlacementStatus> statuses);

    /** Students per department code (current students only), for the Departments screen. */
    @Query("SELECT UPPER(s.departmentCode), COUNT(s) FROM StudentProfile s " +
           "WHERE s.departmentCode IS NOT NULL AND s.user.isDeleted = false GROUP BY UPPER(s.departmentCode)")
    List<Object[]> countStudentsByDepartmentCode();

    /** The department names students use for a code, so a missing department row can be named after them. */
    @Query("SELECT DISTINCT s.department FROM StudentProfile s " +
           "WHERE UPPER(s.departmentCode) = UPPER(:code) AND s.department IS NOT NULL")
    List<String> findDepartmentNamesByCode(@Param("code") String code);

    /** Whether any student, deleted ones included, carries this department code. */
    boolean existsByDepartmentCodeIgnoreCase(String departmentCode);

    /** Which of these register numbers already exist, deleted students included (they stay reserved). */
    @Query("SELECT s.rollNo FROM StudentProfile s WHERE s.rollNo IN :rollNos")
    List<String> findExistingRollNos(@Param("rollNos") Collection<String> rollNos);

    /**
     * Students who finished first-login setup but whose profile is still incomplete and who have not
     * been reminded since {@code cutoff}. Students still on the stand-in email are excluded: there
     * is no address to send to until they complete setup.
     */
    @Query("SELECT s FROM StudentProfile s JOIN FETCH s.user u WHERE u.isDeleted = false AND u.isActive = true " +
           "AND s.profileSetupCompleted = true AND s.profileCompletionPercent < 100 " +
           "AND LOWER(s.email) NOT LIKE '%@pending.gces.local' " +
           "AND (s.profileReminderSentAt IS NULL OR s.profileReminderSentAt < :cutoff)")
    List<StudentProfile> findNeedingProfileReminder(@Param("cutoff") java.time.LocalDateTime cutoff);

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL)")
    long countActiveStudents();

    @Query("SELECT COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED")
    long countPlacedStudents();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countStudentsGroupedByDepartment();

    @Query("SELECT s.department, COUNT(s) FROM StudentProfile s WHERE (s.user.isDeleted = false OR s.user IS NULL) AND s.placementStatus = com.gces.placementcell.entity.enums.PlacementStatus.PLACED AND s.department IS NOT NULL GROUP BY s.department")
    List<Object[]> countPlacedStudentsGroupedByDepartment();
}
