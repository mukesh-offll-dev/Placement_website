package com.gces.placementcell.service;

/**
 * Published when a job goes live and the admin asked for eligible students to be told.
 * Carries only the id: the listener runs after the commit, on another thread, and reloads
 * what it needs rather than holding a detached entity.
 */
public record JobPostedEvent(Long jobId) {
}
