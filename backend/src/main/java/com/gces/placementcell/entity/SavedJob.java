package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing jobs bookmarked / saved by students for later review.
 */
@Entity
@Table(
    name = "saved_jobs",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_saved_job", columnNames = {"student_id", "job_id"})
    },
    indexes = {
        @Index(name = "uq_saved_job", columnList = "student_id, job_id", unique = true),
        @Index(name = "idx_saved_jobs_student", columnList = "student_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"studentProfile", "job"})
@EqualsAndHashCode(of = "id")
public class SavedJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "student_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_saved_jobs_student")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private StudentProfile studentProfile;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_saved_jobs_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt;

    @PrePersist
    protected void onCreate() {
        if (this.savedAt == null) {
            this.savedAt = LocalDateTime.now();
        }
    }
}
