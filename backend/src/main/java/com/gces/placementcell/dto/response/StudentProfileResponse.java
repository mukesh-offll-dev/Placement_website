package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;

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
        LocalDateTime updatedAt,
        // Verified (official) links and sections, lifecycle and verification status
        String githubUrl,
        String linkedinUrl,
        String portfolioUrl,
        List<ProfileData.CertificationItem> certifications,
        List<ProfileData.AchievementItem> achievements,
        List<ProfileData.DocumentItem> documents,
        LifecycleStatus lifecycleStatus,
        ProfileVerificationStatus profileVerificationStatus,
        LocalDateTime profileVerifiedAt
) {

    /** The earlier shape, without the verification-era fields. */
    public StudentProfileResponse(Long id, UserResponse user, String rollNo, String fullName, String email, String phone,
                                  String address, String about, String avatarUrl, String resumeUrl, String college,
                                  String degree, String department, String departmentCode, String batch, Short semester,
                                  BigDecimal cgpa, Integer totalBacklogs, Integer activeBacklogs,
                                  PlacementStatus placementStatus, Boolean isOpenToOpportunities,
                                  CompanyResponse placedCompany, BigDecimal placedCtc, LocalDate placedOn,
                                  Short profileCompletionPercent, List<StudentSkillResponse> skills,
                                  List<StudentEducationResponse> education, List<StudentExperienceResponse> experience,
                                  List<StudentProjectResponse> projects, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(id, user, rollNo, fullName, email, phone, address, about, avatarUrl, resumeUrl, college, degree, department,
                departmentCode, batch, semester, cgpa, totalBacklogs, activeBacklogs, placementStatus,
                isOpenToOpportunities, placedCompany, placedCtc, placedOn, profileCompletionPercent, skills, education,
                experience, projects, createdAt, updatedAt, null, null, null, List.of(), List.of(), List.of(), null, null, null);
    }

    /** Full profile plus the official certifications, achievements and documents. */
    public static StudentProfileResponse withDetails(
            StudentProfile profile,
            List<StudentSkillResponse> skills,
            List<StudentEducationResponse> education,
            List<StudentExperienceResponse> experience,
            List<StudentProjectResponse> projects,
            List<ProfileData.CertificationItem> certifications,
            List<ProfileData.AchievementItem> achievements,
            List<ProfileData.DocumentItem> documents) {
        StudentProfileResponse base = build(profile, skills, education, experience, projects);
        if (base == null) {
            return null;
        }
        return new StudentProfileResponse(base.id(), base.user(), base.rollNo(), base.fullName(), base.email(), base.phone(),
                base.address(), base.about(), base.avatarUrl(), base.resumeUrl(), base.college(), base.degree(),
                base.department(), base.departmentCode(), base.batch(), base.semester(), base.cgpa(), base.totalBacklogs(),
                base.activeBacklogs(), base.placementStatus(), base.isOpenToOpportunities(), base.placedCompany(),
                base.placedCtc(), base.placedOn(), base.profileCompletionPercent(), skills, education, experience, projects,
                base.createdAt(), base.updatedAt(), base.githubUrl(), base.linkedinUrl(), base.portfolioUrl(),
                certifications, achievements, documents, base.lifecycleStatus(), base.profileVerificationStatus(),
                base.profileVerifiedAt());
    }

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
                profile.getSemester() != null ? profile.getSemester().shortValue() : null,
                profile.getCgpa(),
                profile.getTotalBacklogs(),
                profile.getActiveBacklogs(),
                profile.getPlacementStatus(),
                profile.getIsOpenToOpportunities(),
                CompanyResponse.from(profile.getPlacedCompany()),
                profile.getPlacedCtc(),
                profile.getPlacedOn(),
                profile.getProfileCompletionPercent() != null ? profile.getProfileCompletionPercent().shortValue() : null,
                skills,
                education,
                experience,
                projects,
                profile.getCreatedAt(),
                profile.getUpdatedAt(),
                profile.getGithubUrl(),
                profile.getLinkedinUrl(),
                profile.getPortfolioUrl(),
                List.of(),
                List.of(),
                List.of(),
                profile.effectiveLifecycle(),
                profile.getProfileVerificationStatus(),
                profile.getProfileVerifiedAt()
        );
    }
}
