package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.CreateStudentRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.PageResponse;
import com.gces.placementcell.dto.response.StudentDetailDto;
import com.gces.placementcell.dto.response.StudentSummaryDto;
import com.gces.placementcell.entity.enums.PlacementStatus;

import java.math.BigDecimal;

public interface AdminStudentService {

    PageResponse<StudentSummaryDto> getStudents(
            String search,
            String department,
            PlacementStatus status,
            BigDecimal minCgpa,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    StudentDetailDto getStudentById(Long id);

    StudentDetailDto createStudent(CreateStudentRequest request);

    StudentDetailDto updateStudent(Long id, UpdateStudentRequest request);

    void deleteStudent(Long id);

    byte[] exportStudentsCsv(String search, String department, PlacementStatus status);
}
