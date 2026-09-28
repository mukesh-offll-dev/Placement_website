package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing listed requirements and qualifications for a job.
 */
@Entity
@Table(
    name = "job_requirements",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_requirement_order", columnNames = {"job_id", "display_order"})
    },
    indexes = {
        @Index(name = "uq_job_requirement_order", columnList = "job_id, display_order", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_req_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotBlank(message = "Requirement text is required")
    @Size(max = 300, message = "Requirement cannot exceed 300 characters")
    @Column(name = "requirement", nullable = false, length = 300)
    private String requirement;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Short displayOrder = 1;
}
