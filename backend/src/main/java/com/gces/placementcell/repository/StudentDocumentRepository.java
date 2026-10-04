package com.gces.placementcell.repository;

import com.gces.placementcell.entity.StudentDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for StudentDocument entity.
 */
@Repository
public interface StudentDocumentRepository extends JpaRepository<StudentDocument, Long> {

    List<StudentDocument> findByStudentProfileId(Long studentProfileId);
}
