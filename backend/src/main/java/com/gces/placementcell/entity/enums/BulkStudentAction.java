package com.gces.placementcell.entity.enums;

/** Actions available on POST /admin/students/bulk and /faculty/students/bulk. RESTORE is admin only. */
public enum BulkStudentAction {
    DELETE,
    DISABLE,
    ENABLE,
    ARCHIVE,
    RESTORE
}
