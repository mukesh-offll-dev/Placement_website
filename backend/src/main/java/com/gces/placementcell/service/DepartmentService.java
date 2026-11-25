package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.CreateDepartmentRequestDTO;
import com.gces.placementcell.dto.response.DepartmentResponseDTO;

import java.util.List;

public interface DepartmentService {
    List<DepartmentResponseDTO> getAllDepartments();

    DepartmentResponseDTO getDepartmentById(Long id);

    DepartmentResponseDTO createDepartment(CreateDepartmentRequestDTO request);
}
