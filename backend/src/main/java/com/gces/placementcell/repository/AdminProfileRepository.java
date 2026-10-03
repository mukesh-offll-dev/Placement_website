package com.gces.placementcell.repository;

import com.gces.placementcell.entity.AdminProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for AdminProfile entity.
 */
@Repository
public interface AdminProfileRepository extends JpaRepository<AdminProfile, Long> {

    Optional<AdminProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<AdminProfile> findByDepartment(String department);
}
