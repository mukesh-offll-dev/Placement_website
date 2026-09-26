package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * One ordered bullet in a job's requirements list.
 */
@Entity
@Table(name = "job_requirements")
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
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @NotBlank(message = "Requirement text is required")
    @Size(max = 300, message = "Requirement cannot exceed 300 characters")
    @Column(name = "requirement", nullable = false, length = 300)
    private String requirement;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Short displayOrder = 1;
}
