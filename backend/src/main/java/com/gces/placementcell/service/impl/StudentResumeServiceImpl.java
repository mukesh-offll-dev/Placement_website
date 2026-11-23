package com.gces.placementcell.service.impl;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.response.ResumeResponse;
import com.gces.placementcell.entity.StudentDocument;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.DocumentStatus;
import com.gces.placementcell.entity.enums.DocumentType;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentDocumentRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.StudentResumeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Slf4j
@Service
@Transactional
public class StudentResumeServiceImpl implements StudentResumeService {

    private final StudentProfileRepository profileRepository;
    private final StudentDocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final FileStorageProperties properties;

    public StudentResumeServiceImpl(
            StudentProfileRepository profileRepository,
            StudentDocumentRepository documentRepository,
            FileStorageService fileStorageService,
            FileStorageProperties properties,
            com.gces.placementcell.repository.UserRepository userRepository,
            com.gces.placementcell.repository.FacultyProfileRepository facultyProfileRepository) {
        this.profileRepository = profileRepository;
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
        this.properties = properties;
        this.userRepository = userRepository;
        this.facultyProfileRepository = facultyProfileRepository;
    }

    private final com.gces.placementcell.repository.UserRepository userRepository;
    private final com.gces.placementcell.repository.FacultyProfileRepository facultyProfileRepository;

    @Override
    public ResumeResponse uploadResume(Long studentId, MultipartFile file) {
        StudentProfile student = profileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        // Store file safely
        String storedFileName = fileStorageService.storeFile(
                file,
                properties.getResumeSubdir(),
                properties.getAllowedResumeExtensions(),
                properties.getMaxResumeSize()
        );

        String downloadUrl = "/api/students/" + studentId + "/resume/download";
        String fileViewUrl = "/api/files/download/" + properties.getResumeSubdir() + "/" + storedFileName;

        // Update student profile resume URL
        student.setResumeUrl(fileViewUrl);
        profileRepository.save(student);

        // Record in student documents table
        StudentDocument document = documentRepository
                .findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(studentId, DocumentType.RESUME)
                .orElseGet(() -> StudentDocument.builder()
                        .student(student)
                        .documentType(DocumentType.RESUME)
                        .build());
        String previousStoredFile = document.getFileUrl();

        document.setDocumentName(file.getOriginalFilename() != null ? file.getOriginalFilename() : storedFileName);
        document.setFileUrl(storedFileName);
        document.setFileSize(file.getSize());
        document.setStatus(DocumentStatus.PENDING);
        document.setUploadedAt(LocalDateTime.now());

        StudentDocument savedDoc = documentRepository.save(document);

        // The replaced file is no longer referenced by the profile; remove it (best effort).
        if (previousStoredFile != null && !previousStoredFile.isBlank() && !previousStoredFile.equals(storedFileName)) {
            try {
                fileStorageService.deleteFile(properties.getResumeSubdir(), previousStoredFile);
            } catch (RuntimeException ex) {
                log.warn("Could not delete replaced resume file for student {}: {}", studentId, ex.getMessage());
            }
        }

        return ResumeResponse.builder()
                .documentId(savedDoc.getId())
                .studentId(studentId)
                .fileName(document.getDocumentName())
                .resumeUrl(fileViewUrl)
                .downloadUrl(downloadUrl)
                .fileSize(document.getFileSize())
                .status(savedDoc.getStatus())
                .uploadedAt(savedDoc.getUploadedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeResponse getResume(Long studentId) {
        StudentProfile student = profileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        StudentDocument document = documentRepository
                .findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(studentId, DocumentType.RESUME)
                .orElseThrow(() -> new ResourceNotFoundException("No resume found for student ID: " + studentId));

        String downloadUrl = "/api/students/" + studentId + "/resume/download";
        String fileViewUrl = document.getFileUrl() != null && document.getFileUrl().startsWith("/api/files/")
                ? document.getFileUrl()
                : "/api/files/download/" + properties.getResumeSubdir() + "/" + document.getFileUrl();

        return ResumeResponse.builder()
                .documentId(document.getId())
                .studentId(studentId)
                .fileName(document.getDocumentName())
                .resumeUrl(fileViewUrl)
                .downloadUrl(downloadUrl)
                .fileSize(document.getFileSize())
                .status(document.getStatus())
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Resource downloadResume(Long studentId) {
        StudentDocument document = documentRepository
                .findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(studentId, DocumentType.RESUME)
                .orElseThrow(() -> new ResourceNotFoundException("No resume uploaded for student ID: " + studentId));

        if (document.getFileUrl() == null || document.getFileUrl().isBlank()) {
            throw new ResourceNotFoundException("No resume uploaded for student ID: " + studentId);
        }
        // Approved resumes are stored as a full "/api/files/download/{category}/{name}" URL.
        String[] parts = com.gces.placementcell.service.VerificationFiles.parseFileUrl(document.getFileUrl());
        if (parts != null) {
            return fileStorageService.loadFileAsResource(parts[0], parts[1]);
        }
        return fileStorageService.loadFileAsResource(properties.getResumeSubdir(), document.getFileUrl());
    }

    @Override
    public void deleteResume(Long studentId) {
        StudentProfile student = profileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        documentRepository.findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(studentId, DocumentType.RESUME)
                .ifPresent(doc -> {
                    if (doc.getFileUrl() != null && !doc.getFileUrl().isBlank()) {
                        try {
                            fileStorageService.deleteFile(properties.getResumeSubdir(), doc.getFileUrl());
                        } catch (RuntimeException ex) {
                            log.warn("Could not delete resume file for student {}: {}", studentId, ex.getMessage());
                        }
                    }
                    documentRepository.delete(doc);
                });

        student.setResumeUrl(null);
        profileRepository.save(student);
    }

    @Override
    @Transactional(readOnly = true)
    public void verifyAccess(Long studentId, UserDetails userDetails) {
        if (userDetails == null) {
            throw new InsufficientAuthenticationException("Authentication is required to access this resource");
        }

        boolean isAdminOrOfficer = userDetails.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_PLACEMENT_OFFICER".equals(a.getAuthority()));
        if (isAdminOrOfficer) {
            return;
        }

        StudentProfile student = profileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        // A faculty advisor may read (and manage) the resumes of students in their own department.
        boolean isFaculty = userDetails.getAuthorities().stream()
                .anyMatch(a -> "ROLE_FACULTY_ADVISOR".equals(a.getAuthority()));
        if (isFaculty) {
            String code = userRepository.findByEmailAndIsDeletedFalse(userDetails.getUsername())
                    .flatMap(u -> facultyProfileRepository.findByUserId(u.getId()))
                    .map(f -> f.getDepartment() == null ? null : f.getDepartment().getCode())
                    .orElse(null);
            if (code != null && student.getDepartmentCode() != null && code.equalsIgnoreCase(student.getDepartmentCode().trim())) {
                return;
            }
            throw new AccessDeniedException("You are not authorized to access this resume");
        }

        // Ownership is the account the profile belongs to. The profile's own email column is not
        // used: it is a copy that can be stale or shared, so it must not grant access.
        String username = userDetails.getUsername();
        boolean isOwner = student.getUser() != null && student.getUser().getEmail() != null
                && student.getUser().getEmail().equalsIgnoreCase(username);

        if (!isOwner) {
            throw new AccessDeniedException("You are not authorized to access this resume");
        }
    }
}
