package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gces.placementcell.entity.enums.TimelineStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity tracking the step-by-step progress and status history of a Job Application.
 */
@Entity
@Table(
    name = "application_timeline",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_timeline_order", columnNames = {"application_id", "display_order"})
    },
    indexes = {
        @Index(name = "uq_timeline_order", columnList = "application_id, display_order", unique = true),
        @Index(name = "idx_timeline_application", columnList = "application_id"),
        @Index(name = "idx_timeline_status", columnList = "status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"jobApplication", "updatedBy"})
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
        foreignKey = @ForeignKey(name = "fk_timeline_app")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private JobApplication jobApplication;

    @NotBlank(message = "Stage label is required")
    @Size(max = 80, message = "Stage label cannot exceed 80 characters")
    @Column(name = "stage_label", nullable = false, length = 80)
    private String stageLabel;

    @Column(name = "stage_date")
    private LocalDate stageDate;

    @NotNull(message = "Timeline status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private TimelineStatus status;

    @NotNull(message = "Display order is required")
    @Min(value = 1, message = "Display order must be greater than zero")
    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Short displayOrder = 1;

    @Size(max = 255, message = "Remarks cannot exceed 255 characters")
    @Column(name = "remarks", length = 255)
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "updated_by",
        foreignKey = @ForeignKey(name = "fk_timeline_updater")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
    }

    // Helper convenience methods & backward-compatibility aliases
    public String getStage() {
        return stageLabel;
    }

    public void setStage(String stage) {
        this.stageLabel = stage;
    }

    public String getComment() {
        return remarks;
    }

    public void setComment(String comment) {
        this.remarks = comment;
    }

    public User getChangedBy() {
        return updatedBy;
    }

    public void setChangedBy(User changedBy) {
        this.updatedBy = changedBy;
    }

    public LocalDateTime getChangedAt() {
        return createdAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.createdAt = changedAt;
    }

    // Custom builder helpers
    public static class ApplicationTimelineBuilder {
        public ApplicationTimelineBuilder stage(String stage) {
            this.stageLabel = stage;
            return this;
        }

        public ApplicationTimelineBuilder displayOrder(Integer order) {
            this.displayOrder$value = order != null ? order.shortValue() : 1;
            this.displayOrder$set = true;
            return this;
        }

        public ApplicationTimelineBuilder displayOrder(Short order) {
            this.displayOrder$value = order;
            this.displayOrder$set = true;
            return this;
        }

        public ApplicationTimelineBuilder changedBy(User user) {
            this.updatedBy = user;
            return this;
        }

        public ApplicationTimelineBuilder changedAt(LocalDateTime time) {
            this.createdAt = time;
            return this;
        }
    }
}
