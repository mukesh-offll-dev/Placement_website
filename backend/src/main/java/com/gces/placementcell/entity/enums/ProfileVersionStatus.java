package com.gces.placementcell.entity.enums;

/** State of one student_profile_versions row. DRAFT and PENDING are "working"; the rest are history. */
public enum ProfileVersionStatus {
    DRAFT,
    PENDING,
    APPROVED,
    REJECTED,
    WITHDRAWN,
    DISCARDED;

    public boolean isWorking() {
        return this == DRAFT || this == PENDING;
    }
}
