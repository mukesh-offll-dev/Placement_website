package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.ProfileVersionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One proposed version of a student's profile (ProfileData JSON). DRAFT/PENDING rows are the
 * student's working copy; decided rows (APPROVED, REJECTED, WITHDRAWN, DISCARDED) are history and
 * never change again. Maps to table 'student_profile_versions'.
 */
@Entity
@Table(
    name = "student_profile_versions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_profile_version_number", columnNames = {"student_id", "version_number"})
    },
    indexes = {
        @Index(name = "idx_profile_versions_student_status", columnList = "student_id, status"),
        @Index(name = "idx_profile_versions_status_submitted", columnList = "status, submitted_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"student", "reviewedBy", "data", "baseData"})
@EqualsAndHashCode(of = "id")
public class StudentProfileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @ForeignKey(name = "fk_profile_versions_student"))
    private StudentProfile student;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProfileVersionStatus status;

    /** Proposed ProfileData as JSON. */
    @Column(name = "data", nullable = false, columnDefinition = "TEXT")
    private String data;

    /** Official ProfileData snapshot taken at submit, JSON. */
    @Column(name = "base_data", columnDefinition = "TEXT")
    private String baseData;

    /** Comma-separated section keys that differ from the official profile at submit. */
    @Column(name = "changed_sections", length = 255)
    private String changedSections;

    @Column(name = "student_note", length = 1000)
    private String studentNote;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", foreignKey = @ForeignKey(name = "fk_profile_versions_reviewer"))
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_comment", length = 2000)
    private String reviewComment;

    /** JSON object {SECTION: comment}. */
    @Column(name = "section_comments", columnDefinition = "TEXT")
    private String sectionComments;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
