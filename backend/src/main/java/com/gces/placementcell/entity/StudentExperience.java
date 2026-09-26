package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.ExperienceType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing student internship and work experience history.
 */
@Entity
@Table(
    name = "student_experience",
    indexes = {
        @Index(name = "idx_student_experience_student", columnList = "student_id"),
        @Index(name = "idx_student_experience_date", columnList = "student_id, start_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class StudentExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "student_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_student_experience_student")
    )
    private StudentProfile studentProfile;

    @NotBlank(message = "Job role is required")
    @Size(max = 120, message = "Job role cannot exceed 120 characters")
    @Column(name = "job_role", nullable = false, length = 120)
    private String jobRole;

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name cannot exceed 150 characters")
    @Column(name = "company", nullable = false, length = 150)
    private String company;

    @NotNull(message = "Experience type is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "experience_type", nullable = false, length = 50)
    private ExperienceType experienceType = ExperienceType.INTERNSHIP;

    @Size(max = 120, message = "Location cannot exceed 120 characters")
    @Column(name = "location", length = 120)
    private String location;

    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.experienceType == null) {
            this.experienceType = ExperienceType.INTERNSHIP;
        }
        if (this.isCurrent == null) {
            this.isCurrent = false;
        }
    }
}
