package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.enums.ProfileVersionStatus;

import java.time.LocalDateTime;
import java.util.List;

/** One profile version / verification request in a list. */
public record VersionSummary(
        Long id,
        Integer versionNumber,
        ProfileVersionStatus status,
        Long studentId,
        String studentName,
        String rollNo,
        String departmentCode,
        String batch,
        List<String> changedSections,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        String reviewerName,
        String reviewComment
) {
}