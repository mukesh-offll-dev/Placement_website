package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.ApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentApplicationDto {
    private Long id;
    private String studentName;
    private String studentRollNo;
    private String studentDepartment;
    private String jobTitle;
    private String company;
    private ApplicationStatus status;
    private LocalDateTime appliedAt;
}
