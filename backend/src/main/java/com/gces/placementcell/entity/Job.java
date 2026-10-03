package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a Job posting created by placement cell admins or recruiters.
 * Maps to table 'jobs' in the database schema.
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
        @Index(name = "idx_jobs_status_cgpa", columnList = "status, min_cgpa"),
        @Index(name = "idx_jobs_created_at", columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"company", "postedBy", "placementDrives", "eligibleDepartments", "eligibleDegrees", "responsibilities", "skills", "requirements", "perks", "selectionRounds", "applications"})
@EqualsAndHashCode(of = "id")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Company reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "company_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_jobs_company")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    @DecimalMin(value = "0.00", message = "CTC value cannot be negative")
    @Column(name = "ctc_value", precision = 12, scale = 2)
    private BigDecimal ctcValue;

    @Min(value = 1, message = "Vacancies must be greater than zero")
    @Column(name = "vacancies")
    private Integer vacancies;

    @Size(max = 100, message = "Bond details cannot exceed 100 characters")
    @Column(name = "bond", length = 100)
    private String bond;

    @DecimalMin(value = "0.00", message = "Minimum CGPA cannot be negative")
    @DecimalMax(value = "10.00", message = "Minimum CGPA cannot exceed 10.00")
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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "posted_by",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_jobs_poster")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    // -- Domain Relationships
    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<PlacementDrive> placementDrives = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobEligibleDepartment> eligibleDepartments = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobEligibleDegree> eligibleDegrees = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobResponsibility> responsibilities = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobSkill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobRequirement> requirements = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobPerk> perks = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
    private List<JobSelectionRound> selectionRounds = new ArrayList<>();

    @OneToMany(mappedBy = "job", fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnore
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

    // -- Backward compatibility & alias methods
    public String getTitle() {
        return this.jobRole;
    }

    public void setTitle(String title) {
        this.jobRole = title;
    }

    public String getRole() {
        return this.jobRole;
    }

    public void setRole(String role) {
        this.jobRole = role;
    }

    public String getDescription() {
        return this.jobDescription;
    }

    public void setDescription(String description) {
        this.jobDescription = description;
    }

    public String getSalary() {
        return this.ctcText;
    }

    public void setSalary(String salary) {
        this.ctcText = salary;
    }

    public String getPackage() {
        return this.ctcText;
    }

    public void setPackage(String salaryPackage) {
        this.ctcText = salaryPackage;
    }

    public Integer getNumberOfOpenings() {
        return this.vacancies;
    }

    public void setNumberOfOpenings(Integer openings) {
        this.vacancies = openings;
    }

    public EmploymentType getEmploymentType() {
        return this.jobType;
    }

    public void setEmploymentType(EmploymentType employmentType) {
        this.jobType = employmentType;
    }

    public String getCompanyName() {
        return this.company != null ? this.company.getName() : null;
    }

    // -- Relationship helpers: keep both sides in sync so the FK is always populated
    public void addSkill(JobSkill skill) {
        skill.setJob(this);
        this.skills.add(skill);
    }

    public void removeSkill(JobSkill skill) {
        this.skills.remove(skill);
        skill.setJob(null);
    }

    public void addRequirement(JobRequirement requirement) {
        requirement.setJob(this);
        this.requirements.add(requirement);
    }

    public void removeRequirement(JobRequirement requirement) {
        this.requirements.remove(requirement);
        requirement.setJob(null);
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

    // Custom builder helpers for backward compatibility
    public static class JobBuilder {
        public JobBuilder title(String title) {
            this.jobRole = title;
            return this;
        }

        public JobBuilder description(String description) {
            this.jobDescription = description;
            return this;
        }

        public JobBuilder salary(String salary) {
            this.ctcText = salary;
            return this;
        }

        public JobBuilder numberOfOpenings(Integer openings) {
            this.vacancies = openings;
            return this;
        }

        public JobBuilder employmentType(EmploymentType employmentType) {
            this.jobType$value = employmentType;
            this.jobType$set = true;
            return this;
        }
    }
}
