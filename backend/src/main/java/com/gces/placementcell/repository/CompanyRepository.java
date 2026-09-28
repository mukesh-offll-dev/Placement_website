package com.gces.placementcell.repository;

import com.gces.placementcell.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for Company entity.
 */
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findByName(String name);

    Optional<Company> findByNameIgnoreCase(String name);

    boolean existsByName(String name);

    List<Company> findByIndustry(String industry);

    List<Company> findByNameContainingIgnoreCase(String keyword);
}
