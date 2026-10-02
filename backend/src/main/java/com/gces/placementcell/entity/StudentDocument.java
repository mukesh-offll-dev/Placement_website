package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.DocumentStatus;
import com.gces.placementcell.entity.enums.DocumentType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing documents uploaded by students (e.g., Resume, Marksheet, Certificate).
 */
@Entity
@Table(
    name = "student_documents",
    indexes = {
        @Index(name = "idx_student_documents_student", columnList = "student_id"),
        @Index(name = "idx_student_documents_status", columnList = "status"),
        @Index(name = "idx_student_documents_type", columnList = "student_id, document_type")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"student", "verifiedByUser"})
@EqualsAndHashCode(of = "id")
public class StudentDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Student is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @NotBlank(message = "Document name is required")
    @Size(max = 150)
    @Column(name = "document_name", nullable = false, length = 150)
    private String documentName;

    @NotNull(message = "Document type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 50)
    private DocumentType documentType;

    @NotBlank(message = "File URL is required")
    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by", insertable = false, updatable = false)
    private User verifiedByUser;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (this.uploadedAt == null) {
            this.uploadedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = DocumentStatus.PENDING;
        }
    }
}
