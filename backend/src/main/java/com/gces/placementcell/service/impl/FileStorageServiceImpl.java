package com.gces.placementcell.service.impl;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@EnableConfigurationProperties(FileStorageProperties.class)
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
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }

        if (file.getSize() > maxSizeBytes) {
            long maxMb = maxSizeBytes / (1024 * 1024);
            throw new BadRequestException("File size exceeds maximum allowed limit of " + maxMb + "MB");
        }

        String rawOriginalFilename = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "file"));
        if (rawOriginalFilename.contains("..")) {
            throw new BadRequestException("Invalid filename containing path traversal characters");
        }

        String extension = getFileExtension(rawOriginalFilename).toLowerCase();
        if (allowedExtensions != null && !allowedExtensions.isEmpty()) {
            boolean isAllowed = allowedExtensions.stream().anyMatch(ext -> ext.equalsIgnoreCase(extension));
            if (!isAllowed) {
                throw new BadRequestException("File type '." + extension + "' is not supported. Allowed: " + String.join(", ", allowedExtensions));
            }
        }

        // Clean original base name (alphanumeric, dash, underscore)
        String baseName = getBaseName(rawOriginalFilename).replaceAll("[^a-zA-Z0-9._-]", "_");
        if (baseName.length() > 50) {
            baseName = baseName.substring(0, 50);
        }

        String uniqueFileName = UUID.randomUUID().toString().substring(0, 12) + "_" + baseName + (extension.isEmpty() ? "" : "." + extension);

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
        String ext = getFileExtension(fileName).toLowerCase();
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "svg" -> "image/svg+xml";
            default -> "application/octet-stream";
        };
    }

    private String getFileExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < fileName.length() - 1) {
            return fileName.substring(dotIndex + 1);
        }
        return "";
    }

    private String getBaseName(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            return fileName.substring(0, dotIndex);
        }
        return fileName;
    }
}
