package com.gces.placementcell.service;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.impl.FileStorageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {

    private FileStorageServiceImpl fileStorageService;
    private FileStorageProperties properties;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        properties = new FileStorageProperties();
        properties.setUploadDir(tempDir.toString());
        properties.setResumeSubdir("resumes");
        properties.setProjectMediaSubdir("projects");

        fileStorageService = new FileStorageServiceImpl(properties);
        fileStorageService.init();
    }

    @Test
    void testStoreFile_ValidPdf_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample_resume.pdf",
                "application/pdf",
                "Test PDF content".getBytes()
        );

        String storedName = fileStorageService.storeFile(file, "resumes", List.of("pdf", "doc", "docx"), 10485760);
        assertNotNull(storedName);
        assertTrue(storedName.endsWith(".pdf"));

        Resource loaded = fileStorageService.loadFileAsResource("resumes", storedName);
        assertTrue(loaded.exists());
        assertTrue(loaded.isReadable());
    }

    @Test
    void testStoreFile_InvalidExtension_ThrowsBadRequestException() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "dangerous.exe",
                "application/octet-stream",
                "Executable content".getBytes()
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                fileStorageService.storeFile(file, "resumes", List.of("pdf", "doc", "docx"), 10485760));
        assertTrue(ex.getMessage().contains("is not supported"));
    }

    @Test
    void testStoreFile_ExceedsSize_ThrowsBadRequestException() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large.pdf",
                "application/pdf",
                new byte[2048]
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                fileStorageService.storeFile(file, "resumes", List.of("pdf"), 1024));
        assertTrue(ex.getMessage().contains("exceeds maximum allowed limit"));
    }

    @Test
    void testLoadNonExistentFile_ThrowsResourceNotFoundException() {
        assertThrows(ResourceNotFoundException.class, () ->
                fileStorageService.loadFileAsResource("resumes", "nonexistent.pdf"));
    }

    @Test
    void testDeleteFile_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "todelete.pdf",
                "application/pdf",
                "Delete me".getBytes()
        );

        String stored = fileStorageService.storeFile(file, "resumes", List.of("pdf"), 10485760);
        assertTrue(fileStorageService.deleteFile("resumes", stored));
    }
}
