package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing educational qualifications and academic history of a student.
 */
@Entity
@Table(
    name = "student_education",
    indexes = {
        @Index(name = "idx_student_education_student", columnList = "student_id"),
        @Index(name = "idx_student_education_year", columnList = "student_id, end_year")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class StudentEducation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student profile reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "student_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_student_education_student")
    )
    private StudentProfile studentProfile;

    @NotBlank(message = "Institution name is required")
    @Size(max = 150, message = "Institution name cannot exceed 150 characters")
    @Column(name = "institution_name", nullable = false, length = 150)
    private String institutionName;

    @NotBlank(message = "Degree is required")
    @Size(max = 120, message = "Degree cannot exceed 120 characters")
    @Column(name = "degree", nullable = false, length = 120)
    private String degree;

    @Size(max = 150, message = "Board or university cannot exceed 150 characters")
    @Column(name = "board_or_university", length = 150)
    private String boardOrUniversity;

    @NotNull(message = "Start year is required")
    @Column(name = "start_year", nullable = false)
    private Short startYear;

    @Column(name = "end_year")
    private Short endYear;

    @Size(max = 30, message = "Grade cannot exceed 30 characters")
    @Column(name = "grade", length = 30)
    private String grade;

    @Builder.Default
    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isCurrent == null) {
            this.isCurrent = false;
        }
    }
}
