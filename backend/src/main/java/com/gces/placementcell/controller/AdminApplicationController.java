package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.ApplicationStatusUpdateRequest;
import com.gces.placementcell.dto.request.ApplicationTimelineNoteRequest;
import com.gces.placementcell.dto.request.ApplicationTimelineRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.InterviewResponseDto;
import com.gces.placementcell.dto.response.JobApplicationResponse;
import com.gces.placementcell.entity.Interview;
import com.gces.placementcell.entity.enums.ApplicationStatus;
import com.gces.placementcell.service.ApplicationService;
import com.gces.placementcell.service.InterviewService;
import com.gces.placementcell.repository.InterviewRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/applications")
public class AdminApplicationController {

    private final ApplicationService applicationService;
    private final InterviewService interviewService;
    private final InterviewRepository interviewRepository;

    public AdminApplicationController(ApplicationService applicationService,
                                      InterviewService interviewService,
                                      InterviewRepository interviewRepository) {
        this.applicationService = applicationService;
        this.interviewService = interviewService;
        this.interviewRepository = interviewRepository;
    }

    // ------------------- Interview Scheduling -------------------
    @PostMapping("/{id}/interview")
    public ResponseEntity<ApiResponse<InterviewResponseDto>> scheduleInterview(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody com.gces.placementcell.dto.request.InterviewRequestDto request) {
        InterviewResponseDto response = interviewService.scheduleInterview(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Interview scheduled successfully", response));
    }

    @GetMapping("/{id}/interview")
    public ResponseEntity<ApiResponse<InterviewResponseDto>> getInterview(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        Interview interview = interviewRepository.findByJobApplicationId(id);
        InterviewResponseDto dto = InterviewResponseDto.from(interview);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    // ------------------- Application Status -------------------
    @RequestMapping(value = "/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<JobApplicationResponse>> updateStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Application status updated successfully",
                applicationService.updateStatus(userDetails.getUsername(), id, request)));
    }

    // ------------------- Timeline Notes -------------------
    @PostMapping(value = {"/{id}/notes", "/{id}/timeline/notes", "/{id}/timeline-notes"})
    public ResponseEntity<ApiResponse<JobApplicationResponse>> addTimelineNote(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationTimelineNoteRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Timeline note added successfully",
                applicationService.addTimelineNote(userDetails.getUsername(), id, request)));
    }

    // ------------------- Interview Stage (Timeline) -------------------
    @PostMapping("/{id}/timeline")
    public ResponseEntity<ApiResponse<JobApplicationResponse>> addInterviewStage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationTimelineRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Interview stage added successfully",
                applicationService.addInterviewStage(userDetails.getUsername(), id, request)));
    }

    // ------------------- Get Single Application -------------------
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobApplicationResponse>> getApplication(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.getApplication(id)));
    }

    // ------------------- List Applications -------------------
    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobApplicationResponse>>> listApplications(
            @RequestParam(required = false) Long jobId,
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                applicationService.listApplications(jobId, status, studentId, page, size)));
    }
}
