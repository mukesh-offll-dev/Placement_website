package com.gces.placementcell.dto.response;

import java.util.List;

/**
 * Outcome of a bulk student action. {@code failed} lists ids that could not be processed (including
 * ids outside the caller's scope, reported as "Not found"); {@code skippedDetails} explains skips.
 */
public record BulkActionResult(
        int requested,
        int succeeded,
        int skipped,
        List<Item> failed,
        List<Item> skippedDetails
) {

    public record Item(Long studentId, String reason) {
    }
}