package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.JobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentJobDto {
    private Long id;
    private String company;
    private String title;
    private String role;
    private String salary;
    private String location;
    private String cgpa;
    private LocalDate deadline;
    private JobStatus status;
    private LocalDateTime createdAt;
}
