package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing skills possessed by a student.
 */
@Entity
@Table(
    name = "student_skills",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_student_skill", columnNames = {"student_id", "skill_name"})
    },
    indexes = {
        @Index(name = "uq_student_skill", columnList = "student_id, skill_name", unique = true),
        @Index(name = "idx_student_skills_student", columnList = "student_id"),
        @Index(name = "idx_student_skills_name", columnList = "skill_name")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class StudentSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @ForeignKey(name = "fk_student_skills_student"))
    private StudentProfile studentProfile;

    @NotBlank(message = "Skill name is required")
    @Size(max = 60, message = "Skill name cannot exceed 60 characters")
    @Column(name = "skill_name", nullable = false, length = 60)
    private String skillName;

    @Size(max = 20, message = "Proficiency cannot exceed 20 characters")
    @Column(name = "proficiency", length = 20)
    private String proficiency;
}
