package com.gces.placementcell.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "departments", uniqueConstraints = {
                @UniqueConstraint(name = "uq_departments_name", columnNames = { "name" }),
                @UniqueConstraint(name = "uq_departments_code", columnNames = { "code" })
}, indexes = {
                @Index(name = "uq_departments_name", columnList = "name", unique = true),
                @Index(name = "uq_departments_code", columnList = "code", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString
public class Department {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @NotBlank(message = "Department name is required")
        @Size(max = 100, message = "Department name cannot exceed 100 characters")
        @Column(nullable = false, unique = true, length = 100)
        private String name;

        @NotBlank(message = "Department code is required")
        @Size(max = 20, message = "Department code cannot exceed 20 characters")
        @Column(nullable = false, unique = true, length = 20)
        private String code;

        @Size(max = 100, message = "Degree cannot exceed 100 characters")
        @Column(length = 100)
        private String degree;

        @Size(max = 500, message = "Description cannot exceed 500 characters")
        @Column(length = 500)
        private String description;

        @Builder.Default
        @Column(name = "is_active", nullable = false)
        private Boolean isActive = true;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, updatable = false)
        private LocalDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at", nullable = false)
        private LocalDateTime updatedAt;
}
