package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing normalized technology stack tags associated with a student project.
 */
@Entity
@Table(
    name = "project_tech_stack",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_project_technology", columnNames = {"project_id", "technology"})
    },
    indexes = {
        @Index(name = "uq_project_technology", columnList = "project_id, technology", unique = true),
        @Index(name = "idx_project_tech_technology", columnList = "technology")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class ProjectTechStack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Project reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "project_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_project_tech_stack_project")
    )
    private StudentProject project;

    @NotBlank(message = "Technology name is required")
    @Size(max = 60, message = "Technology name cannot exceed 60 characters")
    @Column(name = "technology", nullable = false, length = 60)
    private String technology;
}
