package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a Job posting created by placement cell admins or recruiters.
 */
@Entity
@Table(
    name = "jobs",
    indexes = {
        @Index(name = "idx_jobs_company", columnList = "company_id"),
        @Index(name = "idx_jobs_status", columnList = "status"),
        @Index(name = "idx_jobs_deadline", columnList = "application_deadline"),
        @Index(name = "idx_jobs_min_cgpa", columnList = "min_cgpa"),
        @Index(name = "idx_jobs_posted_date", columnList = "posted_date"),
        @Index(name = "idx_jobs_location", columnList = "location"),
        @Index(name = "idx_jobs_type", columnList = "job_type"),
        @Index(name = "idx_jobs_posted_by", columnList = "posted_by"),
        @Index(name = "idx_jobs_status_deadline", columnList = "status, application_deadline"),
        @Index(name = "idx_jobs_status_cgpa", columnList = "status, min_cgpa")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"applications", "skills", "requirements"})
@EqualsAndHashCode(of = "id")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Company is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotBlank(message = "Job role is required")
    @Size(max = 150, message = "Job role cannot exceed 150 characters")
    @Column(name = "job_role", nullable = false, length = 150)
    private String jobRole;

    @Size(max = 4000, message = "Job description cannot exceed 4000 characters")
    @Column(name = "job_description", length = 4000)
    private String jobDescription;

    @NotNull(message = "Job type is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "job_type", nullable = false, length = 50)
    private EmploymentType jobType = EmploymentType.FULL_TIME;

    @Size(max = 120, message = "Location cannot exceed 120 characters")
    @Column(name = "location", length = 120)
    private String location;

    @Size(max = 30, message = "CTC text cannot exceed 30 characters")
    @Column(name = "ctc_text", length = 30)
    private String ctcText;

    @Column(name = "ctc_value", precision = 12, scale = 2)
    private BigDecimal ctcValue;

    @Positive(message = "Vacancies must be greater than zero")
    @Column(name = "vacancies")
    private Integer vacancies;

    @Size(max = 100, message = "Bond cannot exceed 100 characters")
    @Column(name = "bond", length = 100)
    private String bond;

    @DecimalMin(value = "0.00", message = "Minimum CGPA cannot be below 0")
    @DecimalMax(value = "10.00", message = "Minimum CGPA cannot exceed 10")
    @Column(name = "min_cgpa", precision = 4, scale = 2)
    private BigDecimal minCgpa;

    @Builder.Default
    @Column(name = "backlogs_allowed", nullable = false)
    private Boolean backlogsAllowed = false;

    @Column(name = "graduation_year")
    private Short graduationYear;

    @NotNull(message = "Application deadline is required")
    @Column(name = "application_deadline", nullable = false)
    private LocalDate applicationDeadline;

    @NotNull(message = "Job status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private JobStatus status = JobStatus.ACTIVE;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @NotNull(message = "Posting user is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "posted_by", nullable = false)
    private User postedBy;

    @Column(name = "posted_date", nullable = false)
    private LocalDate postedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<JobSkill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<JobRequirement> requirements = new ArrayList<>();

    @OneToMany(mappedBy = "job", fetch = FetchType.LAZY)
    @Builder.Default
    private List<JobApplication> applications = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.postedDate == null) {
            this.postedDate = LocalDate.now();
        }
        if (this.jobType == null) {
            this.jobType = EmploymentType.FULL_TIME;
        }
        if (this.status == null) {
            this.status = JobStatus.ACTIVE;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
        if (this.backlogsAllowed == null) {
            this.backlogsAllowed = false;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addSkill(JobSkill skill) {
        skills.add(skill);
        skill.setJob(this);
    }

    public void addRequirement(JobRequirement requirement) {
        requirements.add(requirement);
        requirement.setJob(this);
    }

    public boolean isExpired() {
        return this.applicationDeadline != null && this.applicationDeadline.isBefore(LocalDate.now());
    }

    public boolean isOpen() {
        return JobStatus.ACTIVE.equals(this.status)
                && Boolean.TRUE.equals(this.isActive)
                && !isExpired()
                && !Boolean.TRUE.equals(this.isDeleted);
    }
}
