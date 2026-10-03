package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gces.placementcell.entity.enums.DriveMode;
import com.gces.placementcell.entity.enums.DriveStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Entity representing an on-campus, off-campus, or virtual placement drive for a job.
 */
@Entity
@Table(
    name = "placement_drives",
    indexes = {
        @Index(name = "idx_drives_job", columnList = "job_id"),
        @Index(name = "idx_drives_drive_date", columnList = "drive_date"),
        @Index(name = "idx_drives_status", columnList = "status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class PlacementDrive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_placement_drives_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotNull(message = "Drive date is required")
    @Column(name = "drive_date", nullable = false)
    private LocalDate driveDate;

    @Column(name = "drive_time")
    private LocalTime driveTime;

    @Size(max = 150, message = "Venue cannot exceed 150 characters")
    @Column(name = "venue", length = 150)
    private String venue;

    @NotNull(message = "Drive mode is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "mode", nullable = false, length = 50)
    private DriveMode mode = DriveMode.OFFLINE;

    @NotNull(message = "Drive status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private DriveStatus status = DriveStatus.SCHEDULED;

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
        if (this.mode == null) {
            this.mode = DriveMode.OFFLINE;
        }
        if (this.status == null) {
            this.status = DriveStatus.SCHEDULED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
