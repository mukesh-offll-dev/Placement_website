package com.gces.placementcell.dto.response;

import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * The student's working copy of their profile. status is NONE (nothing saved yet; data is the
 * official profile), DRAFT, PENDING, or REJECTED (latest request rejected and not yet edited).
 */
public record DraftResponse(
        Long versionId,
        Integer versionNumber,
        String status,
        ProfileData data,
        ProfileData official,
        List<String> changedSections,
        String reviewComment,
        Map<String, String> sectionComments,
        LocalDateTime submittedAt,
        LocalDateTime updatedAt,
        boolean canEdit,
        boolean canSubmit,
        LifecycleStatus lifecycleStatus,
        ProfileVerificationStatus profileVerificationStatus
) {
}