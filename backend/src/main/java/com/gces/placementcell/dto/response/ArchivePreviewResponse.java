package com.gces.placementcell.dto.response;

/** How many ACTIVE or DISABLED students a batch archive would affect. */
public record ArchivePreviewResponse(long count, String batch, String departmentCode) {
}