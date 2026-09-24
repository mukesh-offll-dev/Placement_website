package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing student project showcase submissions.
 */
@Entity
@Table(
    name = "student_projects",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_student_project_title", columnNames = {"student_id", "title"})
    },
    indexes = {
        @Index(name = "idx_student_projects_student", columnList = "student_id"),
        @Index(name = "uq_student_project_title", columnList = "student_id, title", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class StudentProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "student_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_student_projects_student")
    )
    private StudentProfile studentProfile;

    @NotBlank(message = "Project title is required")
    @Size(max = 150, message = "Project title cannot exceed 150 characters")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "live_url", columnDefinition = "TEXT")
    private String liveUrl;

    @Column(name = "repo_url", columnDefinition = "TEXT")
    private String repoUrl;

    @Column(name = "media_url", columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
