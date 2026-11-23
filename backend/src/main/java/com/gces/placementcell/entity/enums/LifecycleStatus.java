package com.gces.placementcell.entity.enums;

/**
 * Where a student is in their time at the college. Independent of soft delete (users.is_deleted).
 * ACTIVE: normal. DISABLED: cannot sign in (users.is_active=false). ARCHIVED: graduated / left; may sign
 * in read-only but cannot apply, edit or submit, and is hidden from default lists and alerts.
 */
public enum LifecycleStatus {
    ACTIVE,
    DISABLED,
    ARCHIVED
}
