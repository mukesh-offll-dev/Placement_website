package com.gces.placementcell.dto.response;

/** A file uploaded for profile verification; reference {@code fileUrl} from the draft. */
public record VerificationFileResponse(String fileUrl, String fileName, String contentType, long size) {
}