package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.PlacementDriveRequest;
import com.gces.placementcell.dto.response.PlacementDriveResponse;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.PlacementDrive;
import com.gces.placementcell.entity.enums.DriveStatus;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.PlacementDriveRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlacementDriveService {

    private final PlacementDriveRepository driveRepository;
    private final JobService jobService;

    public PlacementDriveService(PlacementDriveRepository driveRepository, JobService jobService) {
        this.driveRepository = driveRepository;
        this.jobService = jobService;
    }

    @Transactional(readOnly = true)
    public List<PlacementDriveResponse> listDrives(Long jobId) {
        List<PlacementDrive> drives = jobId == null
                ? driveRepository.findAll(Sort.by(Sort.Direction.ASC, "driveDate"))
                : driveRepository.findByJobIdOrderByDriveDateAsc(jobId);
        return drives.stream().map(PlacementDriveResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PlacementDriveResponse getDrive(Long id) {
        return PlacementDriveResponse.from(findDrive(id));
    }

    @Transactional
    public PlacementDriveResponse createDrive(PlacementDriveRequest request) {
        return PlacementDriveResponse.from(saveRequest(new PlacementDrive(), request));
    }

    @Transactional
    public PlacementDriveResponse updateDrive(Long id, PlacementDriveRequest request) {
        return PlacementDriveResponse.from(saveRequest(findDrive(id), request));
    }

    @Transactional
    public void deleteDrive(Long id) {
        driveRepository.delete(findDrive(id));
    }

    private PlacementDrive saveRequest(PlacementDrive drive, PlacementDriveRequest request) {
        Job job = jobService.findManagedJob(request.jobId());
        drive.setJob(job);
        drive.setDriveDate(request.driveDate());
        drive.setDriveTime(request.driveTime());
        drive.setVenue(request.venue());
        drive.setMode(request.mode());
        drive.setStatus(request.status() == null ? DriveStatus.SCHEDULED : request.status());
        return driveRepository.save(drive);
    }

    private PlacementDrive findDrive(Long id) {
        return driveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Placement drive", "id", id));
    }
}