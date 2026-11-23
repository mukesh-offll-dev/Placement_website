package com.gces.placementcell.exception;

/**
 * Thrown for the old direct student write endpoints: verified profile sections now change only
 * through a draft that a faculty advisor approves (HTTP 409).
 */
public class ProfileChangeRequiresVerificationException extends ConflictException {

    public static final String MESSAGE = "Profile changes are reviewed by your faculty advisor. "
            + "Edit your profile and submit it for verification.";

    public ProfileChangeRequiresVerificationException() {
        super(MESSAGE);
    }
}