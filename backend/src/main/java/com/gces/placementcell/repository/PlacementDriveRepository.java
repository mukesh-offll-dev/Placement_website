package com.gces.placementcell.repository;

import com.gces.placementcell.entity.PlacementDrive;
import com.gces.placementcell.entity.enums.DriveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Spring Data JPA Repository for PlacementDrive entity.
 */
@Repository
public interface PlacementDriveRepository extends JpaRepository<PlacementDrive, Long> {

    List<PlacementDrive> findByJobId(Long jobId);

    List<PlacementDrive> findByDriveDate(LocalDate driveDate);

    List<PlacementDrive> findByDriveDateGreaterThanEqual(LocalDate date);

    List<PlacementDrive> findByStatus(DriveStatus status);

    List<PlacementDrive> findByJobIdOrderByDriveDateAsc(Long jobId);
}
