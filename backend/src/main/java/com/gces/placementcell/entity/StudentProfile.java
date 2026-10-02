package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.PlacementStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity representing student academic and placement profile.
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
        @Index(name = "idx_student_placement_status", columnList = "placement_status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "user")
@EqualsAndHashCode(of = "id")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Size(max = 20)
    @Column(name = "roll_no", unique = true, length = 20)
    private String rollNo;

    @NotBlank(message = "Full name is required")
    @Size(max = 120)
    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email
    @Size(max = 150)
    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone;

    @Size(max = 255)
    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "about", columnDefinition = "TEXT")
    private String about;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "resume_url", length = 1000)
    private String resumeUrl;

    @Size(max = 150)
    @Column(name = "college", length = 150)
    private String college;

    @Size(max = 100)
    @Column(name = "degree", length = 100)
    private String degree;

    @Size(max = 100)
    @Column(name = "department", length = 100)
    private String department;

    @Size(max = 10)
    @Column(name = "department_code", length = 10)
    private String departmentCode;

    @Size(max = 20)
    @Column(name = "batch", length = 20)
    private String batch;

    @Column(name = "semester")
    private Integer semester;

    @Column(name = "cgpa", precision = 4, scale = 2)
    private BigDecimal cgpa;

    @Builder.Default
    @Column(name = "total_backlogs", nullable = false)
    private Integer totalBacklogs = 0;

    @Builder.Default
    @Column(name = "active_backlogs", nullable = false)
    private Integer activeBacklogs = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "placement_status", nullable = false, length = 50)
    private PlacementStatus placementStatus = PlacementStatus.PENDING;

    @Builder.Default
    @Column(name = "is_open_to_opportunities", nullable = false)
    private Boolean isOpenToOpportunities = true;

    @Column(name = "placed_company_id")
    private Long placedCompanyId;

    @Column(name = "placed_ctc", precision = 12, scale = 2)
    private BigDecimal placedCtc;

    @Column(name = "placed_on")
    private LocalDate placedOn;

    @Builder.Default
    @Column(name = "profile_completion_percent", nullable = false)
    private Integer profileCompletionPercent = 0;

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
