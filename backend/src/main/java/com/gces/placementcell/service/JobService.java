package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.JobRequest;
import com.gces.placementcell.dto.response.CompanyResponse;
import com.gces.placementcell.dto.response.JobResponse;
import com.gces.placementcell.dto.response.JobStatsResponse;
import com.gces.placementcell.dto.response.JobSummaryResponse;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.entity.Job;
import com.gces.placementcell.entity.JobPerk;
import com.gces.placementcell.entity.JobRequirement;
import com.gces.placementcell.entity.JobResponsibility;
import com.gces.placementcell.entity.JobSelectionRound;
import com.gces.placementcell.entity.JobSkill;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.JobStatus;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.CompanyRepository;
import com.gces.placementcell.repository.JobRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

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

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void closeExpiredJobsScheduled() {
        syncExpiredJobs();
    }

    @Transactional
    public int syncExpiredJobs() {
        return jobRepository.closeExpiredJobs(JobStatus.CLOSED, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> listCompanies() {
        return companyRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(CompanyResponse::from)
                .toList();
    }

    @Transactional
    public Page<JobSummaryResponse> listOpenJobs(int page, int size) {
        syncExpiredJobs();
        Pageable pageable = pageRequest(page, size);
        return jobRepository.findOpenJobs(JobStatus.ACTIVE, LocalDate.now(), pageable)
                .map(JobSummaryResponse::from);
    }

    @Transactional
    public JobResponse getPublicJob(Long id) {
        syncExpiredJobs();
        Job job = jobRepository.findWithDetailsByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        if (!job.isOpen()) {
            throw new ResourceNotFoundException("Job", "id", id);
        }
        return JobResponse.from(job);
    }

    @Transactional
    public JobStatsResponse getJobStats() {
        syncExpiredJobs();
        LocalDate today = LocalDate.now();
        LocalDate upcomingCutoff = today.plusDays(7);
        List<Job> all = jobRepository.findByIsDeletedFalse();

        long totalJobs = all.size();
        long activeJobs = all.stream().filter(Job::isOpen).count();
        long closedJobs = totalJobs - activeJobs;
        long upcomingDeadlines = all.stream()
                .filter(Job::isOpen)
                .filter(j -> j.getApplicationDeadline() != null
                        && !j.getApplicationDeadline().isBefore(today)
                        && !j.getApplicationDeadline().isAfter(upcomingCutoff))
                .count();

        return new JobStatsResponse(totalJobs, activeJobs, closedJobs, upcomingDeadlines);
    }

    @Transactional
    public Page<JobSummaryResponse> listAdminJobs(int page, int size) {
        syncExpiredJobs();
        return jobRepository.findByIsDeletedFalse(pageRequest(page, size))
                .map(JobSummaryResponse::from);
    }

    @Transactional
    public JobResponse getAdminJob(Long id) {
        syncExpiredJobs();
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
    public JobResponse closeJob(Long id) {
        Job job = findManagedJob(id);
        job.setStatus(JobStatus.CLOSED);
        job.setIsActive(false);
        return JobResponse.from(jobRepository.save(job));
    }

    @Transactional
    public JobResponse reopenJob(Long id) {
        Job job = findManagedJob(id);
        if (job.isExpired()) {
            throw new BadRequestException(
                    "Cannot reopen an expired job. Please update the application deadline to a future date first.");
        }
        job.setStatus(JobStatus.ACTIVE);
        job.setIsActive(true);
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

    private Company resolveCompany(JobRequest request) {
        Company company;
        if (request.companyId() != null) {
            company = companyRepository.findById(request.companyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.companyId()));
        } else if (request.companyName() != null && !request.companyName().isBlank()) {
            String trimmedName = request.companyName().trim();
            company = companyRepository.findByNameIgnoreCase(trimmedName)
                    .orElseGet(() -> {
                        String shortName = buildShortName(trimmedName);
                        return companyRepository.save(Company.builder()
                                .name(trimmedName)
                                .shortName(shortName)
                                .logoColor("bg-blue-100 text-blue-700")
                                .build());
                    });
        } else {
            throw new BadRequestException("Company is required");
        }

        if (Boolean.TRUE.equals(request.removeLogo())) {
            company.setLogoUrl(null);
            company = companyRepository.save(company);
        } else if (request.companyLogoUrl() != null && !request.companyLogoUrl().isBlank()) {
            company.setLogoUrl(request.companyLogoUrl().trim());
            company = companyRepository.save(company);
        }

        if (request.companyWebsite() != null && !request.companyWebsite().isBlank()) {
            company.setWebsite(request.companyWebsite().trim());
            company = companyRepository.save(company);
        }

        return company;
    }

    private String formatCtcText(java.math.BigDecimal ctcValue) {
        if (ctcValue == null) {
            return null;
        }
        String num = ctcValue.stripTrailingZeros().toPlainString();
        return num + " LPA";
    }

    private String buildShortName(String name) {
        String cleaned = name.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        if (cleaned.isEmpty()) {
            return "CO";
        }
        return cleaned.substring(0, Math.min(2, cleaned.length()));
    }

    private void applyRequest(Job job, JobRequest request) {
        if (request.applicationDeadline() == null) {
            throw new BadRequestException("Application deadline is required");
        }
        if (request.applicationDeadline().isBefore(LocalDate.now())) {
            throw new BadRequestException("Application deadline cannot be in the past");
        }
        if (request.minCgpa() != null && request.maxCgpa() != null
                && request.minCgpa().compareTo(request.maxCgpa()) > 0) {
            throw new BadRequestException("Minimum CGPA must not exceed Maximum CGPA");
        }

        Company company = resolveCompany(request);
        JobStatus status = request.status() == null ? JobStatus.ACTIVE : request.status();
        String ctcText = (request.ctcText() != null && !request.ctcText().isBlank())
                ? request.ctcText().trim()
                : formatCtcText(request.ctcValue());

        job.setCompany(company);
        job.setJobRole(request.jobRole().trim());
        job.setJobDescription(request.jobDescription());
        job.setJobType(request.jobType());
        job.setLocation(request.location());
        job.setCtcText(ctcText);
        job.setCtcValue(request.ctcValue());
        job.setVacancies(request.vacancies());
        job.setBond(request.bond());
        job.setMinCgpa(request.minCgpa());
        job.setMaxCgpa(request.maxCgpa());
        job.setContactEmail(request.contactEmail() != null && !request.contactEmail().isBlank()
                ? request.contactEmail().trim()
                : null);
        job.setApplicationUrl(request.applicationUrl() != null && !request.applicationUrl().isBlank()
                ? request.applicationUrl().trim()
                : null);
        job.setApplicationInstructions(
                request.applicationInstructions() != null && !request.applicationInstructions().isBlank()
                        ? request.applicationInstructions().trim()
                        : null);
        job.setBacklogsAllowed(request.backlogsAllowed() != null && request.backlogsAllowed());
        job.setGraduationYear(request.graduationYear());
        job.setApplicationDeadline(request.applicationDeadline());
        job.setStatus(status);
        job.setIsActive(status == JobStatus.ACTIVE || status == JobStatus.CLOSING_SOON);

        boolean isExisting = job.getId() != null;
        job.getSkills().clear();
        job.getRequirements().clear();
        job.getResponsibilities().clear();
        job.getPerks().clear();
        job.getSelectionRounds().clear();
        if (isExisting) {
            // Flush orphan deletions before re-inserting to avoid unique constraint
            // violations
            jobRepository.flush();
        }

        if (request.skills() != null) {
            Set<String> uniqueSkills = new LinkedHashSet<>();
            for (String skill : request.skills()) {
                if (skill != null && !skill.isBlank()) {
                    uniqueSkills.add(skill.trim());
                }
            }
            uniqueSkills.forEach(skill -> job.addSkill(JobSkill.builder().skillName(skill).build()));
        }

        if (request.requirements() != null) {
            int order = 1;
            for (String req : request.requirements()) {
                if (req != null && !req.isBlank()) {
                    job.addRequirement(JobRequirement.builder()
                            .requirement(req.trim())
                            .displayOrder((short) order++)
                            .build());
                }
            }
        }

        if (request.responsibilities() != null) {
            int order = 1;
            for (String resp : request.responsibilities()) {
                if (resp != null && !resp.isBlank()) {
                    job.addResponsibility(JobResponsibility.builder()
                            .responsibility(resp.trim())
                            .displayOrder((short) order++)
                            .build());
                }
            }
        }

        if (request.perks() != null) {
            Set<String> uniquePerks = new LinkedHashSet<>();
            for (String perk : request.perks()) {
                if (perk != null && !perk.isBlank()) {
                    uniquePerks.add(perk.trim());
                }
            }
            uniquePerks.forEach(perk -> job.addPerk(JobPerk.builder().perk(perk).build()));
        }

        if (request.selectionRounds() != null) {
            int roundNum = 1;
            for (String roundName : request.selectionRounds()) {
                if (roundName != null && !roundName.isBlank()) {
                    job.addSelectionRound(JobSelectionRound.builder()
                            .roundNumber((short) roundNum++)
                            .roundName(roundName.trim())
                            .build());
                }
            }
        }
    }

    private Pageable pageRequest(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "postedDate", "id"));
    }
}
