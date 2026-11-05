package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.dto.response.StudentExperienceResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.StudentSkillResponse;

import java.util.List;

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

    /**
     * Retrieves all skills for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @return List of StudentSkillResponse.
     */
    List<StudentSkillResponse> getSkills(String email);

    /**
     * Updates/replaces all skills for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @param skills List of skill names.
     * @return List of StudentSkillResponse.
     */
    List<StudentSkillResponse> updateSkills(String email, List<String> skills);

    /**
     * Adds a single skill to the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param request StudentSkillRequest containing skill details.
     * @return StudentSkillResponse representing the newly created skill.
     */
    StudentSkillResponse addSkill(String email, StudentSkillRequest request);

    /**
     * Updates an existing skill on the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param skillId ID of the skill to update.
     * @param request StudentSkillRequest containing updated details.
     * @return StudentSkillResponse representing the updated skill.
     */
    StudentSkillResponse updateSkill(String email, Long skillId, StudentSkillRequest request);

    /**
     * Deletes a skill from the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param skillId ID of the skill to remove.
     */
    void deleteSkill(String email, Long skillId);

    /**
     * Retrieves all education entries for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @return List of StudentEducationResponse.
     */
    List<StudentEducationResponse> getEducation(String email);

    /**
     * Adds an education entry to the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param request StudentEducationRequest containing education details.
     * @return StudentEducationResponse representing the created entry.
     */
    StudentEducationResponse addEducation(String email, StudentEducationRequest request);

    /**
     * Updates an education entry on the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param educationId ID of the education entry to update.
     * @param request StudentEducationRequest containing updated details.
     * @return StudentEducationResponse representing the updated entry.
     */
    StudentEducationResponse updateEducation(String email, Long educationId, StudentEducationRequest request);

    /**
     * Deletes an education entry from the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param educationId ID of the education entry to delete.
     */
    void deleteEducation(String email, Long educationId);

    /**
     * Retrieves all experience / internship entries for the authenticated student.
     *
     * @param email Email of the authenticated student.
     * @return List of StudentExperienceResponse.
     */
    List<StudentExperienceResponse> getExperience(String email);

    /**
     * Adds an experience / internship entry to the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param request StudentExperienceRequest containing experience details.
     * @return StudentExperienceResponse representing the created entry.
     */
    StudentExperienceResponse addExperience(String email, StudentExperienceRequest request);

    /**
     * Updates an experience / internship entry on the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param experienceId ID of the experience entry to update.
     * @param request StudentExperienceRequest containing updated details.
     * @return StudentExperienceResponse representing the updated entry.
     */
    StudentExperienceResponse updateExperience(String email, Long experienceId, StudentExperienceRequest request);

    /**
     * Deletes an experience / internship entry from the authenticated student's profile.
     *
     * @param email Email of the authenticated student.
     * @param experienceId ID of the experience entry to delete.
     */
    void deleteExperience(String email, Long experienceId);
}
