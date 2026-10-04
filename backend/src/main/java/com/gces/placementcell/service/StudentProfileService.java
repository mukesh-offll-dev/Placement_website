package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.response.StudentProfileResponse;

/**
 * Service interface for student profile management.
 */
public interface StudentProfileService {

    /**
     * Retrieves the profile of the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @return StudentProfileResponse containing personal, academic, and child collection details.
     */
    StudentProfileResponse getProfile(String email);

    /**
     * Creates a new profile for the authenticated student if one does not already exist.
     *
     * @param email Email of the authenticated student.
     * @param request StudentProfileRequest containing profile fields.
     * @return StudentProfileResponse representing the newly created profile.
     */
    StudentProfileResponse createProfile(String email, StudentProfileRequest request);

    /**
     * Updates the existing profile of the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param request StudentProfileRequest containing updated fields.
     * @return StudentProfileResponse representing the updated profile.
     */
    StudentProfileResponse updateProfile(String email, StudentProfileRequest request);
}
