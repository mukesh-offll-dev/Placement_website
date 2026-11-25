package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.CreateDepartmentRequestDTO;
import com.gces.placementcell.dto.response.DepartmentResponseDTO;
import com.gces.placementcell.entity.Department;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.DepartmentRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentResponseDTO> getAllDepartments() {
        List<Department> departments = departmentRepository.findByIsActiveTrueOrderByIdAsc();

        // Compute student counts per department dynamically
        Map<String, Long> studentCounts = new HashMap<>();
        for (Object[] row : studentProfileRepository.countStudentsGroupedByDepartment()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                studentCounts.put(((String) row[0]).toLowerCase().trim(), ((Number) row[1]).longValue());
            }
        }

        Map<String, Long> placedCounts = new HashMap<>();
        for (Object[] row : studentProfileRepository.countPlacedStudentsGroupedByDepartment()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                placedCounts.put(((String) row[0]).toLowerCase().trim(), ((Number) row[1]).longValue());
            }
        }

        List<DepartmentResponseDTO> result = new ArrayList<>();
        for (Department dept : departments) {
            String deptKey = dept.getName() != null ? dept.getName().toLowerCase().trim() : "";
            String codeKey = dept.getCode() != null ? dept.getCode().toLowerCase().trim() : "";

            long total = studentCounts.getOrDefault(deptKey, studentCounts.getOrDefault(codeKey, 0L));
            long placed = placedCounts.getOrDefault(deptKey, placedCounts.getOrDefault(codeKey, 0L));
            double rate = total > 0 ? Math.round(((double) placed / total) * 1000.0) / 10.0 : 0.0;

            result.add(DepartmentResponseDTO.builder()
                    .id(dept.getId())
                    .name(dept.getName())
                    .code(dept.getCode())
                    .degree(dept.getDegree())
                    .description(dept.getDescription())
                    .isActive(dept.getIsActive())
                    .totalStudents(total)
                    .placedStudents(placed)
                    .placementRate(rate)
                    .build());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentResponseDTO getDepartmentById(Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));

        return DepartmentResponseDTO.builder()
                .id(dept.getId())
                .name(dept.getName())
                .code(dept.getCode())
                .degree(dept.getDegree())
                .description(dept.getDescription())
                .isActive(dept.getIsActive())
                .build();
    }

    @Override
    @Transactional
    public DepartmentResponseDTO createDepartment(CreateDepartmentRequestDTO request) {
        String trimmedName = request.getName().trim();
        String trimmedCode = request.getCode().trim().toUpperCase();

        if (departmentRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new DuplicateResourceException("Department with name '" + trimmedName + "' already exists");
        }
        if (departmentRepository.existsByCodeIgnoreCase(trimmedCode)) {
            throw new DuplicateResourceException("Department with code '" + trimmedCode + "' already exists");
        }

        Department dept = Department.builder()
                .name(trimmedName)
                .code(trimmedCode)
                .degree(request.getDegree() != null && !request.getDegree().isBlank() ? request.getDegree().trim() : "B.E")
                .description(request.getDescription() != null ? request.getDescription().trim() : "")
                .isActive(true)
                .build();

        Department saved = departmentRepository.save(dept);

        return DepartmentResponseDTO.builder()
                .id(saved.getId())
                .name(saved.getName())
                .code(saved.getCode())
                .degree(saved.getDegree())
                .description(saved.getDescription())
                .isActive(saved.getIsActive())
                .totalStudents(0L)
                .placedStudents(0L)
                .placementRate(0.0)
                .build();
    }
}

