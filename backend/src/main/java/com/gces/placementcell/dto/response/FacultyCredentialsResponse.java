package com.gces.placementcell.dto.response;

/**
 * A faculty account plus its temporary password. Returned only by account creation and password
 * reset; the password is never stored in plain text nor returned again.
 */
public record FacultyCredentialsResponse(FacultyDto faculty, String temporaryPassword) {
}