package com.gces.placementcell.dto.response;

/** GET /faculty/verifications/summary and /admin/verifications/summary. */
public record VerificationCounts(long pending, long approved, long rejected) {
}