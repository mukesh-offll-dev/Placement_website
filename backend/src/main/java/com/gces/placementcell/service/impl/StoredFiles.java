package com.gces.placementcell.service.impl;

import com.gces.placementcell.exception.BadRequestException;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Upload rules shared by every storage backend (local disk, Cloudinary). */
final class StoredFiles {

    private StoredFiles() {
    }

    /** Validates the upload and returns the unique name to store it under. */
    static String validatedUniqueName(MultipartFile file, List<String> allowedExtensions, long maxSizeBytes) {
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

        String extension = extension(rawOriginalFilename);
        if (allowedExtensions != null && !allowedExtensions.isEmpty()
                && allowedExtensions.stream().noneMatch(ext -> ext.equalsIgnoreCase(extension))) {
            throw new BadRequestException("File type '." + extension + "' is not supported. Allowed: "
                    + String.join(", ", allowedExtensions));
        }

        String baseName = baseName(rawOriginalFilename).replaceAll("[^a-zA-Z0-9._-]", "_");
        if (baseName.length() > 50) {
            baseName = baseName.substring(0, 50);
        }
        return UUID.randomUUID().toString().substring(0, 12) + "_" + baseName + (extension.isEmpty() ? "" : "." + extension);
    }

    static String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot > 0 && dot < fileName.length() - 1 ? fileName.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    static String baseName(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot > 0 ? fileName.substring(0, dot) : fileName;
    }

    static String contentType(String fileName) {
        return switch (extension(fileName)) {
            case "pdf" -> "application/pdf";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "svg" -> "image/svg+xml";
            case "mp4" -> "video/mp4";
            default -> "application/octet-stream";
        };
    }
}
