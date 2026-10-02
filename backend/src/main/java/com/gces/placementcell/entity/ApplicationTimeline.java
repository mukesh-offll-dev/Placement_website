package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.TimelineStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity tracking the step-by-step progress and status history of a Job Application.
 */
@Entity
@Table(
    name = "application_timeline",
    indexes = {
        @Index(name = "idx_timeline_application", columnList = "application_id"),
        @Index(name = "idx_timeline_status", columnList = "status"),
        @Index(name = "idx_timeline_changed_at", columnList = "changed_at"),
        @Index(name = "idx_timeline_app_order", columnList = "application_id, display_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"jobApplication"})
@EqualsAndHashCode(of = "id")
public class ApplicationTimeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job application reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "application_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_timeline_application")
    )
    private JobApplication jobApplication;

    @NotBlank(message = "Stage label is required")
    @Size(max = 80, message = "Stage label cannot exceed 80 characters")
    @Column(name = "stage", nullable = false, length = 80)
    private String stage;

    @NotNull(message = "Timeline status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private TimelineStatus status;

    @Size(max = 255, message = "Remarks cannot exceed 255 characters")
    @Column(name = "remarks", length = 255)
    private String remarks;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "changed_by",
        foreignKey = @ForeignKey(name = "fk_timeline_changed_by")
    )
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (this.changedAt == null) {
            this.changedAt = LocalDateTime.now();
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
    }

    // Helper convenience methods
    public String getComment() {
        return remarks;
    }

    public void setComment(String comment) {
        this.remarks = comment;
    }

    public String getStageLabel() {
        return stage;
    }

    public void setStageLabel(String stageLabel) {
        this.stage = stageLabel;
    }

    public LocalDateTime getCreatedAt() {
        return changedAt;
    }
}
