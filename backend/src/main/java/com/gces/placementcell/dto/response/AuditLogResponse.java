package com.gces.placementcell.dto.response;

import java.time.LocalDateTime;

/** One audit log row, with the actor's display name resolved. */
public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorName,
        String actorRole,
        String action,
        String entityType,
        Long entityId,
        String details,
        LocalDateTime createdAt
) {
}