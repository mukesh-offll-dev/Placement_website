package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.PlacementStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing Student Profile storing personal, academic, contact, resume, and placement details.
 * 1:1 relationship with User table (where role = 'STUDENT').
 */
@Entity
@Table(
    name = "student_profiles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_student_profiles_user", columnNames = {"user_id"}),
        @UniqueConstraint(name = "uq_student_profiles_roll_no", columnNames = {"roll_no"})
    },
    indexes = {
        @Index(name = "uq_student_profiles_user", columnList = "user_id", unique = true),
        @Index(name = "uq_student_profiles_roll_no", columnList = "roll_no", unique = true),
        @Index(name = "idx_student_department_code", columnList = "department_code"),
        @Index(name = "idx_student_cgpa", columnList = "cgpa"),
        @Index(name = "idx_student_placement_status", columnList = "placement_status"),
        @Index(name = "idx_student_semester", columnList = "semester"),
        @Index(name = "idx_student_placed_company", columnList = "placed_company_id"),
        @Index(name = "idx_student_dept_cgpa", columnList = "department_code, cgpa"),
        @Index(name = "idx_student_status_dept", columnList = "placement_status, department_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User reference is required")
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true, foreignKey = @ForeignKey(name = "fk_student_profiles_user"))
    private User user;

    @Size(max = 20, message = "Roll number cannot exceed 20 characters")
    @Column(name = "roll_no", length = 20, unique = true)
    private String rollNo;

    // -- Personal / Contact
    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name cannot exceed 120 characters")
    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    @Column(name = "phone", length = 20)
    private String phone;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "about", columnDefinition = "TEXT")
    private String about;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "resume_url", columnDefinition = "TEXT")
    private String resumeUrl;

    // -- Academic
    @Size(max = 150, message = "College name cannot exceed 150 characters")
    @Column(name = "college", length = 150)
    private String college;

    @Size(max = 100, message = "Degree cannot exceed 100 characters")
    @Column(name = "degree", length = 100)
    private String degree;

    @Size(max = 100, message = "Department cannot exceed 100 characters")
    @Column(name = "department", length = 100)
    private String department;

    @Size(max = 10, message = "Department code cannot exceed 10 characters")
    @Column(name = "department_code", length = 10)
    private String departmentCode;

    @Size(max = 20, message = "Batch cannot exceed 20 characters")
    @Column(name = "batch", length = 20)
    private String batch;

    @Min(value = 1, message = "Semester must be between 1 and 10")
    @Max(value = 10, message = "Semester must be between 1 and 10")
    @Column(name = "semester")
    private Short semester;

    @DecimalMin(value = "0.00", message = "CGPA must be at least 0.00")
    @DecimalMax(value = "10.00", message = "CGPA cannot exceed 10.00")
    @Column(name = "cgpa", precision = 4, scale = 2)
    private BigDecimal cgpa;

    @Min(value = 0, message = "Total backlogs cannot be negative")
    @Builder.Default
    @Column(name = "total_backlogs", nullable = false)
    private Integer totalBacklogs = 0;

    @Min(value = 0, message = "Active backlogs cannot be negative")
    @Builder.Default
    @Column(name = "active_backlogs", nullable = false)
    private Integer activeBacklogs = 0;

    // -- Placement
    @NotNull(message = "Placement status is required")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "placement_status", nullable = false, length = 50)
    private PlacementStatus placementStatus = PlacementStatus.PENDING;

    @Builder.Default
    @Column(name = "is_open_to_opportunities", nullable = false)
    private Boolean isOpenToOpportunities = true;

    @Column(name = "placed_company_id")
    private Long placedCompanyId;

    @DecimalMin(value = "0.00", message = "Placed CTC cannot be negative")
    @Column(name = "placed_ctc", precision = 12, scale = 2)
    private BigDecimal placedCtc;

    @Column(name = "placed_on")
    private LocalDate placedOn;

    @Min(value = 0, message = "Profile completion percent must be between 0 and 100")
    @Max(value = 100, message = "Profile completion percent must be between 0 and 100")
    @Builder.Default
    @Column(name = "profile_completion_percent", nullable = false)
    private Short profileCompletionPercent = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.totalBacklogs == null) {
            this.totalBacklogs = 0;
        }
        if (this.activeBacklogs == null) {
            this.activeBacklogs = 0;
        }
        if (this.placementStatus == null) {
            this.placementStatus = PlacementStatus.PENDING;
        }
        if (this.isOpenToOpportunities == null) {
            this.isOpenToOpportunities = true;
        }
        if (this.profileCompletionPercent == null) {
            this.profileCompletionPercent = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
