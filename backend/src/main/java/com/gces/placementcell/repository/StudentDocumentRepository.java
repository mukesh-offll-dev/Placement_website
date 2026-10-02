package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentId(Long studentId);

    List<StudentDocument> findByStudentIdAndDocumentType(Long studentId, DocumentType documentType);

    Optional<StudentDocument> findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(Long studentId, DocumentType documentType);

    void deleteByStudentIdAndDocumentType(Long studentId, DocumentType documentType);
}
