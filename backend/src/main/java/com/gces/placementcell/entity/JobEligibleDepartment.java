package com.gces.placementcell.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing eligible academic departments for a job posting.
 */
@Entity
@Table(
    name = "job_eligible_departments",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_job_eligible_department", columnNames = {"job_id", "department_code"})
    },
    indexes = {
        @Index(name = "uq_job_eligible_department", columnList = "job_id, department_code", unique = true),
        @Index(name = "idx_job_elig_dept_code", columnList = "department_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"job"})
@EqualsAndHashCode(of = "id")
public class JobEligibleDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Job reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "job_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_job_dept_job")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Job job;

    @NotBlank(message = "Department code is required")
    @Size(max = 10, message = "Department code cannot exceed 10 characters")
    @Column(name = "department_code", nullable = false, length = 10)
    private String departmentCode;
}
