package com.gces.placementcell.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileStorageService {

    /**
     * Stores an uploaded file in the specified subdirectory with validation.
     *
     * @param file               MultipartFile uploaded
     * @param subDirectory       Target subdirectory (e.g., 'resumes', 'projects')
     * @param allowedExtensions  List of allowed extensions without dot (e.g. 'pdf', 'docx')
     * @param maxSizeBytes       Max allowed size in bytes
     * @return The stored unique filename
     */
    String storeFile(MultipartFile file, String subDirectory, List<String> allowedExtensions, long maxSizeBytes);

    /**
     * Loads a stored file as a Spring Resource.
     *
     * @param subDirectory Subdirectory name
     * @param fileName     Name of file to retrieve
     * @return Spring Resource
     */
    Resource loadFileAsResource(String subDirectory, String fileName);

    /**
     * Deletes a stored file if it exists.
     *
     * @param subDirectory Subdirectory name
     * @param fileName     Name of file to delete
     * @return true if deleted, false otherwise
     */
    boolean deleteFile(String subDirectory, String fileName);

    /**
     * Determines the content type of a file by extension.
     *
     * @param fileName File name
     * @return Content-Type string (e.g. 'application/pdf', 'image/png')
     */
    String getContentType(String fileName);
}
