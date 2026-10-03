package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gces.placementcell.entity.enums.DriveMode;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

/**
 * Entity representing an evaluation round in a job recruitment process (e.g., Online Assessment, Tech Interview).
 */
@Entity
@Table(
    name = "job_selection_rounds",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_round_number", columnNames = {"job_id", "round_number"})
    },
    indexes = {
        @Index(name = "uq_job_round_number", columnList = "job_id, round_number", unique = true),
        @Index(name = "idx_job_rounds_job", columnList = "job_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobSelectionRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_rounds_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotNull(message = "Round number is required")
    @Min(value = 1, message = "Round number must be greater than zero")
    @Column(name = "round_number", nullable = false)
    private Short roundNumber;

    @NotBlank(message = "Round name is required")
    @Size(max = 120, message = "Round name cannot exceed 120 characters")
    @Column(name = "round_name", nullable = false, length = 120)
    private String roundName;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_mode", length = 50)
    private DriveMode roundMode;

    @Column(name = "scheduled_on")
    private LocalDate scheduledOn;
}
