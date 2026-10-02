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
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

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
            FileStorageProperties properties) {
        this.profileRepository = profileRepository;
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
        this.properties = properties;
    }

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

        document.setDocumentName(file.getOriginalFilename() != null ? file.getOriginalFilename() : storedFileName);
        document.setFileUrl(storedFileName);
        document.setFileSize(file.getSize());
        document.setStatus(DocumentStatus.PENDING);
        document.setUploadedAt(LocalDateTime.now());

        StudentDocument savedDoc = documentRepository.save(document);

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
        String fileViewUrl = "/api/files/download/" + properties.getResumeSubdir() + "/" + document.getFileUrl();

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

        return fileStorageService.loadFileAsResource(properties.getResumeSubdir(), document.getFileUrl());
    }

    @Override
    public void deleteResume(Long studentId) {
        StudentProfile student = profileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        documentRepository.findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(studentId, DocumentType.RESUME)
                .ifPresent(doc -> {
                    fileStorageService.deleteFile(properties.getResumeSubdir(), doc.getFileUrl());
                    documentRepository.delete(doc);
                });

        student.setResumeUrl(null);
        profileRepository.save(student);
    }
}
