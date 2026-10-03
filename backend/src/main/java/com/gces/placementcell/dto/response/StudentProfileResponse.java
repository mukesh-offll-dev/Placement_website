package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.enums.PlacementStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * A student's full profile page.
 *
 * The nested {@link UserResponse} carries the login details minus the password hash;
 * the entity's User association is never serialised directly.
 */
public record StudentProfileResponse(
        Long id,
        UserResponse user,
        String rollNo,
        String fullName,
        String email,
        String phone,
        String address,
        String about,
        String avatarUrl,
        String resumeUrl,
        String college,
        String degree,
        String department,
        String departmentCode,
        String batch,
        Short semester,
        BigDecimal cgpa,
        Integer totalBacklogs,
        Integer activeBacklogs,
        PlacementStatus placementStatus,
        Boolean isOpenToOpportunities,
        CompanyResponse placedCompany,
        BigDecimal placedCtc,
        LocalDate placedOn,
        Short profileCompletionPercent,
        List<StudentSkillResponse> skills,
        List<StudentEducationResponse> education,
        List<StudentExperienceResponse> experience,
        List<StudentProjectResponse> projects,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    @com.fasterxml.jackson.annotation.JsonProperty("role")
    public String role() {
        return user != null && user.role() != null ? user.role().name() : "STUDENT";
    }

    /** Header and academic fields only; every child collection comes back empty. */
    public static StudentProfileResponse from(StudentProfile profile) {
        return build(profile, List.of(), List.of(), List.of(), List.of());
    }

    /**
     * Full profile including child rows.
     *
     * The collections are passed in rather than read off the entity because a single
     * query cannot fetch four List associations at once (Hibernate throws
     * MultipleBagFetchException), so the service loads them through their own
     * repositories and hands them here.
     */
    public static StudentProfileResponse withDetails(
            StudentProfile profile,
            List<StudentSkillResponse> skills,
            List<StudentEducationResponse> education,
            List<StudentExperienceResponse> experience,
            List<StudentProjectResponse> projects) {
        return build(profile, skills, education, experience, projects);
    }

    private static StudentProfileResponse build(
            StudentProfile profile,
            List<StudentSkillResponse> skills,
            List<StudentEducationResponse> education,
            List<StudentExperienceResponse> experience,
            List<StudentProjectResponse> projects) {
        if (profile == null) {
            return null;
        }
        return new StudentProfileResponse(
                profile.getId(),
                UserResponse.from(profile.getUser()),
                profile.getRollNo(),
                profile.getFullName(),
                profile.getEmail(),
                profile.getPhone(),
                profile.getAddress(),
                profile.getAbout(),
                profile.getAvatarUrl(),
                profile.getResumeUrl(),
                profile.getCollege(),
                profile.getDegree(),
                profile.getDepartment(),
                profile.getDepartmentCode(),
                profile.getBatch(),
                profile.getSemester(),
                profile.getCgpa(),
                profile.getTotalBacklogs(),
                profile.getActiveBacklogs(),
                profile.getPlacementStatus(),
                profile.getIsOpenToOpportunities(),
                CompanyResponse.from(profile.getPlacedCompany()),
                profile.getPlacedCtc(),
                profile.getPlacedOn(),
                profile.getProfileCompletionPercent(),
                skills,
                education,
                experience,
                projects,
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
