package com.gces.placementcell.service;

import com.gces.placementcell.dto.response.AuditLogResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.entity.AuditLog;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.repository.AuditLogRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Writes and reads the audit log. Rows are written in the caller's transaction, so an action that
 * rolls back leaves no audit row behind. Details are plain text and must never contain a password.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final UserDisplayNames displayNames;

    /** The signed-in user, if any. */
    @Transactional(readOnly = true)
    public Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        return userRepository.findByEmailAndIsDeletedFalse(auth.getName());
    }

    @Transactional
    public void record(String action, String entityType, Long entityId, String details) {
        record(currentUser().orElse(null), action, entityType, entityId, details);
    }

    @Transactional
    public void record(User actor, String action, String entityType, Long entityId, String details) {
        String clean = details == null ? null : details.replaceAll("[\\r\\n]+", " ");
        if (clean != null && clean.length() > 2000) {
            clean = clean.substring(0, 1999) + "…";
        }
        auditLogRepository.save(AuditLog.builder()
                .actorUserId(actor != null ? actor.getId() : null)
                .actorRole(actor != null && actor.getRole() != null ? actor.getRole().name() : null)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(clean)
                .build());
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogResponse> search(String action, String entityType, int page, int size) {
        int validSize = size > 0 ? Math.min(size, MAX_PAGE_SIZE) : 20;
        Page<AuditLog> rows = auditLogRepository.search(
                StringUtils.hasText(action) ? action.trim().toUpperCase() : null,
                StringUtils.hasText(entityType) ? entityType.trim().toUpperCase() : null,
                PageRequest.of(Math.max(0, page), validSize, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        Set<Long> actorIds = rows.getContent().stream().map(AuditLog::getActorUserId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> names = displayNames.namesFor(actorIds);
        return PagedResponse.of(rows, a -> new AuditLogResponse(a.getId(), a.getActorUserId(),
                a.getActorUserId() == null ? null : names.get(a.getActorUserId()), a.getActorRole(), a.getAction(),
                a.getEntityType(), a.getEntityId(), a.getDetails(), a.getCreatedAt()));
    }
}
