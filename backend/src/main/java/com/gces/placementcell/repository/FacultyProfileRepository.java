package com.gces.placementcell.repository;

import com.gces.placementcell.entity.FacultyProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacultyProfileRepository extends JpaRepository<FacultyProfile, Long> {

    @EntityGraph(attributePaths = {"user", "department"})
    Optional<FacultyProfile> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "department"})
    @Query("SELECT f FROM FacultyProfile f JOIN f.user u WHERE u.isDeleted = false ORDER BY f.fullName ASC")
    List<FacultyProfile> findAllLive();

    @EntityGraph(attributePaths = {"user", "department"})
    @Query("SELECT f FROM FacultyProfile f WHERE f.id = :id AND f.user.isDeleted = false")
    Optional<FacultyProfile> findLiveById(@Param("id") Long id);

    /** Faculty assigned to a department whose login is live (not deleted); active or not. */
    @EntityGraph(attributePaths = {"user", "department"})
    @Query("SELECT f FROM FacultyProfile f WHERE f.department.id = :departmentId AND f.user.isDeleted = false")
    List<FacultyProfile> findLiveByDepartmentId(@Param("departmentId") Long departmentId);

    @EntityGraph(attributePaths = {"user", "department"})
    @Query("SELECT f FROM FacultyProfile f WHERE f.department.id IN :departmentIds AND f.user.isDeleted = false")
    List<FacultyProfile> findLiveByDepartmentIds(@Param("departmentIds") Collection<Long> departmentIds);

    /** The department's advisors who can currently sign in. */
    @EntityGraph(attributePaths = {"user", "department"})
    @Query("SELECT f FROM FacultyProfile f WHERE UPPER(f.department.code) = UPPER(:code) "
            + "AND f.user.isDeleted = false AND f.user.isActive = true")
    List<FacultyProfile> findActiveByDepartmentCode(@Param("code") String code);

    @Query("SELECT f FROM FacultyProfile f WHERE f.user.id IN :userIds")
    List<FacultyProfile> findByUserIds(@Param("userIds") Collection<Long> userIds);
}
