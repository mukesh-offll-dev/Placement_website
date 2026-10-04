package com.gces.placementcell.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Pagination envelope for list endpoints.
 *
 * Spring's own PageImpl serialises with an unstable, warning-producing shape, so the
 * paged repository queries are mapped through this fixed contract instead. Mapping here
 * also forces entities to be converted to DTOs before they leave the transaction.
 *
 * @param content the page's items, already converted to response DTOs
 */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last,
        boolean empty
) {

    /** Maps each entity on the page through {@code mapper}, keeping the page metadata. */
    public static <E, T> PagedResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PagedResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.isEmpty()
        );
    }

    /** For pages whose content is already in DTO form. */
    public static <T> PagedResponse<T> of(Page<T> page) {
        return of(page, Function.identity());
    }
}
