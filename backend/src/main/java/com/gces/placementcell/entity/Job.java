package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.EmploymentType;
import com.gces.placementcell.entity.enums.JobStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

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
        @Index(name = "idx_jobs_status", columnList = "status"),
        @Index(name = "idx_jobs_company", columnList = "company"),
        @Index(name = "idx_jobs_deadline", columnList = "application_deadline"),
        @Index(name = "idx_jobs_employment_type", columnList = "employment_type"),
        @Index(name = "idx_jobs_posted_by", columnList = "posted_by"),
        @Index(name = "idx_jobs_status_deadline", columnList = "status, application_deadline"),
        @Index(name = "idx_jobs_created_at", columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"applications"})
@EqualsAndHashCode(of = "id")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Job title is required")
    @Size(max = 150, message = "Job title cannot exceed 150 characters")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name cannot exceed 150 characters")
    @Column(name = "company", nullable = false, length = 150)
    private String company;

    @Size(max = 120, message = "Location cannot exceed 120 characters")
    @Column(name = "location", length = 120)
    private String location;

    @Size(max = 100, message = "Salary/package cannot exceed 100 characters")
    @Column(name = "salary", length = 100)
    private String salary;

    @NotNull(message = "Employment type is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "employment_type", nullable = false, length = 50)
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    @Column(name = "skills", columnDefinition = "TEXT")
    private String skills;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "number_of_openings")
    private Integer numberOfOpenings;

    @NotNull(message = "Application deadline is required")
    @Column(name = "application_deadline", nullable = false)
    private LocalDate applicationDeadline;

    @NotNull(message = "Job status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private JobStatus status = JobStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "posted_by",
        foreignKey = @ForeignKey(name = "fk_jobs_posted_by")
    )
    private User postedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

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
        if (this.employmentType == null) {
            this.employmentType = EmploymentType.FULL_TIME;
        }
        if (this.status == null) {
            this.status = JobStatus.ACTIVE;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Convenience alias accessors for flexibility across modules
    public String getRole() {
        return title;
    }

    public void setRole(String role) {
        this.title = role;
    }

    public String getJobRole() {
        return title;
    }

    public void setJobRole(String jobRole) {
        this.title = jobRole;
    }

    public String getPackage() {
        return salary;
    }

    public void setPackage(String salaryPackage) {
        this.salary = salaryPackage;
    }

    public Integer getVacancies() {
        return numberOfOpenings;
    }

    public void setVacancies(Integer vacancies) {
        this.numberOfOpenings = vacancies;
    }

    public boolean isExpired() {
        return this.applicationDeadline != null && this.applicationDeadline.isBefore(LocalDate.now());
    }

    public boolean isOpen() {
        return JobStatus.ACTIVE.equals(this.status) && !isExpired() && !Boolean.TRUE.equals(this.isDeleted);
    }
}
