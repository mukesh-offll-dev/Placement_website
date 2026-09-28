package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing perks and benefits offered by the company for a job.
 */
@Entity
@Table(
    name = "job_perks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_perk", columnNames = {"job_id", "perk"})
    },
    indexes = {
        @Index(name = "uq_job_perk", columnList = "job_id, perk", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobPerk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_perk_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotBlank(message = "Perk description is required")
    @Size(max = 150, message = "Perk cannot exceed 150 characters")
    @Column(name = "perk", nullable = false, length = 150)
    private String perk;
}
