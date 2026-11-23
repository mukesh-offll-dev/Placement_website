package com.gces.placementcell.exception;

/** The request conflicts with the current state of a record (HTTP 409). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}