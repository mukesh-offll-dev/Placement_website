package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing eligible academic degrees (e.g., B.E., B.Tech, M.E.) for a job posting.
 */
@Entity
@Table(
    name = "job_eligible_degrees",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_eligible_degree", columnNames = {"job_id", "degree"})
    },
    indexes = {
        @Index(name = "uq_job_eligible_degree", columnList = "job_id, degree", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobEligibleDegree {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_deg_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotBlank(message = "Degree is required")
    @Size(max = 60, message = "Degree cannot exceed 60 characters")
    @Column(name = "degree", nullable = false, length = 60)
    private String degree;
}
