package com.gces.placementcell.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDepartmentRequestDTO {

    @NotBlank(message = "Department name is required")
    @Size(max = 100, message = "Department name cannot exceed 100 characters")
    private String name;

    @NotBlank(message = "Department code is required")
    @Size(max = 20, message = "Department code cannot exceed 20 characters")
    private String code;

    @Size(max = 100, message = "Degree cannot exceed 100 characters")
    private String degree;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
}
