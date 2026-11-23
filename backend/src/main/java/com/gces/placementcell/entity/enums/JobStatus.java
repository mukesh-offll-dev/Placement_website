package com.gces.placementcell.entity.enums;

import java.util.List;

public enum JobStatus {
    DRAFT,
    ACTIVE,
    CLOSING_SOON,
    CLOSED;

    /** Statuses under which a job accepts applications and appears in student listings. */
    public static final List<JobStatus> OPEN_STATUSES = List.of(ACTIVE, CLOSING_SOON);

    public static boolean isOpenStatus(JobStatus status) {
        return status == ACTIVE || status == CLOSING_SOON;
    }
}
