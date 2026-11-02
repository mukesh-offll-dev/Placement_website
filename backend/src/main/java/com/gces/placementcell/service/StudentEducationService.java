package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;

import java.util.List;

public interface StudentEducationService {

    StudentEducationResponse createEducation(String email, StudentEducationRequest request);

    List<StudentEducationResponse> getAllEducation(String email);

    StudentEducationResponse getEducationById(String email, Long educationId);

    StudentEducationResponse updateEducation(String email, Long educationId, StudentEducationRequest request);

    void deleteEducation(String email, Long educationId);
}

