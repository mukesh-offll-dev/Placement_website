package com.gces.placementcell.dto.response;

import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.entity.enums.ProfileVersionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** A profile version with the proposed data, the snapshot it was based on, the official data now and its history. */
public record VersionDetail(
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
        String reviewComment,
        String studentNote,
        ProfileData proposed,
        ProfileData base,
        ProfileData current,
        Map<String, String> sectionComments,
        List<ProfileData.EvidenceItem> evidence,
        List<Event> events
) {

    public record Event(String action, String actorName, String actorRole, String comment, LocalDateTime at) {
    }
}