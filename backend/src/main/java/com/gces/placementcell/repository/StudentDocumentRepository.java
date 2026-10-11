package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentDocument entity.
 */
@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentId(Long studentId);

    default List<StudentDocument> findByStudentProfileId(Long studentProfileId) {
        return findByStudentId(studentProfileId);
    }

    Optional<StudentDocument> findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(Long studentId, DocumentType documentType);
}
