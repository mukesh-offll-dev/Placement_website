package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.ResumeResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StudentResumeService {

    /**
     * Uploads or updates a student's resume.
     *
     * @param studentId ID of the student
     * @param file      Resume file (PDF, DOC, DOCX)
     * @return Resume metadata response
     */
    ResumeResponse uploadResume(Long studentId, MultipartFile file);

    /**
     * Gets the latest resume details for a student.
     *
     * @param studentId ID of the student
     * @return Resume metadata response
     */
    ResumeResponse getResume(Long studentId);

    /**
     * Loads the student's resume file as a downloadable resource.
     *
     * @param studentId ID of the student
     * @return Spring Resource
     */
    Resource downloadResume(Long studentId);

    /**
     * Deletes the student's resume.
     *
     * @param studentId ID of the student
     */
    void deleteResume(Long studentId);
}
