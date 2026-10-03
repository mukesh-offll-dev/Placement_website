package com.gces.placementcell.controller;

import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.service.JobService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<JobSummaryResponse>>> listJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(jobService.listOpenJobs(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJob(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(jobService.getPublicJob(id)));
    }
}