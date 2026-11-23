package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for StudentDocument entity.
 *
 * The owning association on StudentDocument is named "student" (not "studentProfile"),
 * so derived queries must use the StudentId prefix.
 */
@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentId(Long studentId);

    boolean existsByStudentIdAndFileUrl(Long studentId, String fileUrl);

    List<StudentDocument> findByStudentIdAndDocumentType(Long studentId, DocumentType documentType);

    Optional<StudentDocument> findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(Long studentId, DocumentType documentType);

    void deleteByStudentIdAndDocumentType(Long studentId, DocumentType documentType);

    boolean existsByStudentIdAndFileUrlEndingWith(Long studentId, String suffix);

    /** A document of some student in the department references this stored file name (bare or as a URL). */
    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END "
            + "FROM StudentDocument d WHERE UPPER(d.student.departmentCode) = UPPER(:code) "
            + "AND (d.fileUrl = :fileName OR d.fileUrl LIKE CONCAT('%/', :fileName))")
    boolean existsInDepartmentWithFile(@org.springframework.data.repository.query.Param("code") String departmentCode,
                                       @org.springframework.data.repository.query.Param("fileName") String fileName);
}
