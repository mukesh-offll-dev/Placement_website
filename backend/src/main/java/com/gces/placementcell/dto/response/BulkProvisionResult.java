package com.gces.placementcell.dto.response;

import java.util.List;

/** Outcome of a bulk student creation: what was made and what already existed. */
public record BulkProvisionResult(
        int requested,
        int created,
        int skipped,
        List<String> createdRegisterNumbers,
        List<String> skippedRegisterNumbers
) {
}
