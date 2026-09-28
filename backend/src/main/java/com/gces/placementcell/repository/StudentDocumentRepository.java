package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.DocumentType;
import com.gces.placementcell.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentDocument entity.
 */
@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentProfileId(Long studentProfileId);

    List<StudentDocument> findByStudentProfileIdAndDocumentType(Long studentProfileId, DocumentType documentType);

    List<StudentDocument> findByStatus(VerificationStatus status);

    List<StudentDocument> findByStudentProfileIdAndStatus(Long studentProfileId, VerificationStatus status);

    Optional<StudentDocument> findByStudentProfileIdAndDocumentTypeAndStatus(
            Long studentProfileId, DocumentType documentType, VerificationStatus status);

    long countByStatus(VerificationStatus status);

    long countByStudentProfileIdAndStatus(Long studentProfileId, VerificationStatus status);

    void deleteByStudentProfileId(Long studentProfileId);

    @Modifying
    @Query("UPDATE StudentDocument d SET d.status = :status, d.verifiedBy = :verifiedBy, d.verifiedAt = :verifiedAt WHERE d.id = :documentId")
    int updateVerificationStatus(
            @Param("documentId") Long documentId,
            @Param("status") VerificationStatus status,
            @Param("verifiedBy") User verifiedBy,
            @Param("verifiedAt") LocalDateTime verifiedAt
    );
}
