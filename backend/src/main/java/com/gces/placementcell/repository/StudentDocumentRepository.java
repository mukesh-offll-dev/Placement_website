package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.enums.DocumentType;
import com.gces.placementcell.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for StudentDocument entity.
 */
@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentProfileId(Long studentProfileId);

    List<StudentDocument> findByStudentProfileIdAndDocumentType(Long studentProfileId, DocumentType documentType);

    List<StudentDocument> findByStatus(VerificationStatus status);

    long countByStudentProfileIdAndStatus(Long studentProfileId, VerificationStatus status);

    void deleteByStudentProfileId(Long studentProfileId);
}
