package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.ApplicationStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a student's application to a specific job posting.
 */
@Entity
@Table(
    name = "job_applications",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_application_job_student", columnNames = {"job_id", "student_id"})
    },
    indexes = {
        @Index(name = "idx_app_student", columnList = "student_id"),
        @Index(name = "idx_app_job", columnList = "job_id"),
        @Index(name = "idx_app_status", columnList = "status"),
        @Index(name = "idx_app_applied_on", columnList = "applied_on"),
        @Index(name = "idx_app_student_status", columnList = "student_id, status"),
        @Index(name = "idx_app_job_status", columnList = "job_id, status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"timeline"})
@EqualsAndHashCode(of = "id")
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_applications_job")
    )
    private Job job;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "student_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_applications_student")
    )
    private StudentProfile studentProfile;

    @NotNull(message = "Application status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Size(max = 4000, message = "Cover letter cannot exceed 4000 characters")
    @Column(name = "cover_letter", length = 4000)
    private String coverLetter;

    @Size(max = 1000, message = "Resume URL cannot exceed 1000 characters")
    @Column(name = "resume_url", length = 1000)
    private String resumeUrl;

    @Builder.Default
    @Column(name = "consent_given", nullable = false)
    private Boolean consentGiven = false;

    @Size(max = 80, message = "Current stage label cannot exceed 80 characters")
    @Column(name = "current_stage", length = 80)
    private String currentStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "reviewed_by",
        foreignKey = @ForeignKey(name = "fk_job_applications_reviewed_by")
    )
    private User reviewedBy;

    @Size(max = 255, message = "Remarks cannot exceed 255 characters")
    @Column(name = "remarks", length = 255)
    private String remarks;

    @Column(name = "applied_on", nullable = false)
    private LocalDateTime appliedOn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "jobApplication", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ApplicationTimeline> timeline = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.appliedOn == null) {
            this.appliedOn = now;
        }
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.status == null) {
            this.status = ApplicationStatus.APPLIED;
        }
        if (this.currentStage == null) {
            this.currentStage = "Application Submitted";
        }
        if (this.consentGiven == null) {
            this.consentGiven = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addTimeline(ApplicationTimeline entry) {
        timeline.add(entry);
        entry.setJobApplication(this);
    }

    public void removeTimeline(ApplicationTimeline entry) {
        timeline.remove(entry);
        entry.setJobApplication(null);
    }
}
