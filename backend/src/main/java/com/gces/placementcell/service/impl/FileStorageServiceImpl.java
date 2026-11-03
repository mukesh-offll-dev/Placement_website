package com.gces.placementcell.service.impl;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.List;

@Service
@EnableConfigurationProperties(FileStorageProperties.class)
@ConditionalOnProperty(name = "file.storage", havingValue = "local", matchIfMissing = true)
public class FileStorageServiceImpl implements FileStorageService {


    private final Path rootLocation;
    private final FileStorageProperties properties;

    public FileStorageServiceImpl(FileStorageProperties properties) {
        this.properties = properties;
        this.rootLocation = Paths.get(properties.getUploadDir()).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.rootLocation);
            Files.createDirectories(this.rootLocation.resolve(properties.getResumeSubdir()));
            Files.createDirectories(this.rootLocation.resolve(properties.getProjectMediaSubdir()));
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory, List<String> allowedExtensions, long maxSizeBytes) {
        String uniqueFileName = StoredFiles.validatedUniqueName(file, allowedExtensions, maxSizeBytes);

        try {
            Path targetDir = this.rootLocation.resolve(subDirectory).normalize();
            if (!targetDir.startsWith(this.rootLocation)) {
                throw new BadRequestException("Cannot store file outside current storage root");
            }
            Files.createDirectories(targetDir);

            Path targetLocation = targetDir.resolve(uniqueFileName);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            return uniqueFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store file " + uniqueFileName, ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String subDirectory, String fileName) {
        try {
            Path targetDir = this.rootLocation.resolve(subDirectory).normalize();
            Path filePath = targetDir.resolve(fileName).normalize();

            if (!filePath.startsWith(this.rootLocation)) {
                throw new BadRequestException("Cannot access file outside current storage root");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("File not found: " + fileName, ex);
        }
    }

    @Override
    public boolean deleteFile(String subDirectory, String fileName) {
        try {
            Path targetDir = this.rootLocation.resolve(subDirectory).normalize();
            Path filePath = targetDir.resolve(fileName).normalize();
            if (filePath.startsWith(this.rootLocation) && Files.exists(filePath)) {
                return Files.deleteIfExists(filePath);
            }
            return false;
        } catch (IOException e) {
            return false;
        }
    }

    @Override
    public String getContentType(String fileName) {
        return StoredFiles.contentType(fileName);
    }
}
