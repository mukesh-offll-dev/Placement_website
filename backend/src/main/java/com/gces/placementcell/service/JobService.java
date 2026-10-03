package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobRequirement;
import com.gces.placementcell.entity.JobSkill;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    public JobService(JobRepository jobRepository,
                      CompanyRepository companyRepository,
                      UserRepository userRepository) {
        this.jobRepository = jobRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> listOpenJobs(int page, int size) {
        Pageable pageable = pageRequest(page, size);
        return jobRepository.findOpenJobs(JobStatus.ACTIVE, LocalDate.now(), pageable)
                .map(JobSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public JobResponse getPublicJob(Long id) {
        Job job = jobRepository.findWithDetailsByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        if (!job.isOpen()) {
            throw new ResourceNotFoundException("Job", "id", id);
        }
        return JobResponse.from(job);
    }

    @Transactional(readOnly = true)
    public Page<JobSummaryResponse> listAdminJobs(int page, int size) {
        return jobRepository.findByIsDeletedFalse(pageRequest(page, size))
                .map(JobSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public JobResponse getAdminJob(Long id) {
        Job job = jobRepository.findWithDetailsByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        return JobResponse.from(job);
    }

    @Transactional
    public JobResponse createJob(JobRequest request, String adminEmail) {
        Job job = new Job();
        job.setPostedBy(findAdmin(adminEmail));
        job.setPostedDate(LocalDate.now());
        applyRequest(job, request);
        return JobResponse.from(jobRepository.save(job));
    }

    @Transactional
    public JobResponse updateJob(Long id, JobRequest request) {
        Job job = findManagedJob(id);
        applyRequest(job, request);
        return JobResponse.from(jobRepository.save(job));
    }

    @Transactional
    public void deleteJob(Long id) {
        Job job = findManagedJob(id);
        job.setIsDeleted(true);
        job.setIsActive(false);
        job.setStatus(JobStatus.CLOSED);
        jobRepository.save(job);
    }

    @Transactional(readOnly = true)
    public Job findManagedJob(Long id) {
        return jobRepository.findById(id)
                .filter(job -> !Boolean.TRUE.equals(job.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
    }

    private User findAdmin(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private void applyRequest(Job job, JobRequest request) {
        Company company = companyRepository.findById(request.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.companyId()));
        JobStatus status = request.status() == null ? JobStatus.ACTIVE : request.status();

        job.setCompany(company);
        job.setJobRole(request.jobRole());
        job.setJobDescription(request.jobDescription());
        job.setJobType(request.jobType());
        job.setLocation(request.location());
        job.setCtcText(request.ctcText());
        job.setCtcValue(request.ctcValue());
        job.setVacancies(request.vacancies());
        job.setBond(request.bond());
        job.setMinCgpa(request.minCgpa());
        job.setBacklogsAllowed(request.backlogsAllowed() != null && request.backlogsAllowed());
        job.setGraduationYear(request.graduationYear());
        job.setApplicationDeadline(request.applicationDeadline());
        job.setStatus(status);
        job.setIsActive(status == JobStatus.ACTIVE || status == JobStatus.CLOSING_SOON);

        job.getSkills().clear();
        if (request.skills() != null) {
            request.skills().forEach(skill -> job.addSkill(JobSkill.builder().skillName(skill).build()));
        }

        job.getRequirements().clear();
        if (request.requirements() != null) {
            for (int index = 0; index < request.requirements().size(); index++) {
                job.addRequirement(JobRequirement.builder()
                        .requirement(request.requirements().get(index))
                        .displayOrder((short) (index + 1))
                        .build());
            }
        }
    }

    private Pageable pageRequest(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "postedDate"));
    }
}