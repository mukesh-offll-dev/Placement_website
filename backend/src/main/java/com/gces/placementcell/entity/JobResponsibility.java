package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing listed key job responsibilities.
 */
@Entity
@Table(
    name = "job_responsibilities",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_responsibility_order", columnNames = {"job_id", "display_order"})
    },
    indexes = {
        @Index(name = "uq_job_responsibility_order", columnList = "job_id, display_order", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobResponsibility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_resp_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotBlank(message = "Responsibility text is required")
    @Size(max = 300, message = "Responsibility cannot exceed 300 characters")
    @Column(name = "responsibility", nullable = false, length = 300)
    private String responsibility;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Short displayOrder = 1;
}
