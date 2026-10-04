package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentProfileUpdateRequest;
import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.EducationEntry;
import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.ExperienceEntry;
import com.gces.placementcell.dto.request.StudentProfileUpdateRequest.ProjectEntry;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.entity.*;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StudentProfileService {

    private static final Pattern ACADEMIC_YEARS = Pattern.compile("(19|20)\\d{2}");
    private static final Pattern EXPERIENCE_DATES = Pattern.compile(
            "(\\d{4}-\\d{2}-\\d{2})\\s*[–-]\\s*(\\d{4}-\\d{2}-\\d{2}|Present)");

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentEducationRepository educationRepository;
    private final StudentExperienceRepository experienceRepository;
    private final StudentProjectRepository projectRepository;
    private final StudentSkillRepository skillRepository;
    private final ProjectTechStackRepository techStackRepository;

    public StudentProfileService(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            StudentEducationRepository educationRepository,
            StudentExperienceRepository experienceRepository,
            StudentProjectRepository projectRepository,
            StudentSkillRepository skillRepository,
            ProjectTechStackRepository techStackRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.educationRepository = educationRepository;
        this.experienceRepository = experienceRepository;
        this.projectRepository = projectRepository;
        this.skillRepository = skillRepository;
        this.techStackRepository = techStackRepository;
    }

    @Transactional
    public StudentProfileResponse getProfile(String authenticatedEmail) {
        User user = requireStudent(authenticatedEmail);
        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> studentProfileRepository.save(StudentProfile.builder()
                        .user(user)
                        .fullName(user.getEmail())
                        .email(user.getEmail())
                        .build()));
        return toResponse(profile);
    }

    @Transactional
    public StudentProfileResponse updateProfile(String authenticatedEmail, StudentProfileUpdateRequest request) {
        User user = requireStudent(authenticatedEmail);
        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> StudentProfile.builder()
                        .user(user)
                        .fullName(user.getEmail())
                        .email(user.getEmail())
                        .build());

        if (request.name() != null && !request.name().isBlank()) profile.setFullName(request.name().trim());
        profile.setEmail(user.getEmail());
        profile.setDegree(normalize(request.degree()));
        profile.setCollege(normalize(request.college()));
        profile.setRollNo(normalize(request.rollNo()));
        profile.setPhone(normalize(request.phone()));
        profile.setAddress(normalize(request.address()));
        profile.setAbout(normalize(request.about()));
        profile = studentProfileRepository.save(profile);

        replaceEducation(profile, request.education());
        replaceExperience(profile, request.experience());
        replaceProjects(profile, request.projects());
        replaceSkills(profile, request.skills());

        return toResponse(profile);
    }

    private User requireStudent(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .filter(User::isStudent)
                .filter(User::isAccountActive)
                .orElseThrow(() -> new ResourceNotFoundException("Student account not found"));
    }

    private void replaceEducation(StudentProfile profile, List<EducationEntry> entries) {
        educationRepository.deleteByStudentProfileId(profile.getId());
        if (entries == null) return;
        for (EducationEntry entry : entries) {
            short[] years = parseAcademicYears(entry.year());
            educationRepository.save(StudentEducation.builder()
                    .studentProfile(profile)
                    .institutionName(normalize(entry.college()))
                    .degree(normalize(entry.degree()))
                    .startYear(years[0])
                    .endYear(years[1] == 0 ? null : years[1])
                    .grade(normalize(entry.grade()))
                    .isCurrent(years[1] == 0)
                    .build());
        }
    }

    private void replaceExperience(StudentProfile profile, List<ExperienceEntry> entries) {
        experienceRepository.deleteByStudentProfileId(profile.getId());
        if (entries == null) return;
        for (ExperienceEntry entry : entries) {
            LocalDate[] dates = parseExperienceDates(entry.duration());
            experienceRepository.save(StudentExperience.builder()
                    .studentProfile(profile)
                    .jobRole(normalize(entry.role()))
                    .company(normalize(entry.company()))
                    .experienceType(ExperienceType.INTERNSHIP)
                    .startDate(dates[0])
                    .endDate(dates[1])
                    .isCurrent(dates[1] == null)
                    .description(normalize(entry.description()))
                    .build());
        }
    }

    private void replaceProjects(StudentProfile profile, List<ProjectEntry> entries) {
        List<StudentProject> existingProjects = projectRepository.findByStudentProfileId(profile.getId());
        existingProjects.forEach(project -> techStackRepository.deleteByProjectId(project.getId()));
        projectRepository.deleteAll(existingProjects);
        if (entries == null) return;
        for (ProjectEntry entry : entries) {
            StudentProject project = projectRepository.save(StudentProject.builder()
                    .studentProfile(profile)
                    .title(normalize(entry.title()))
                    .description(normalize(entry.desc()))
                    .liveUrl(normalize(entry.live()))
                    .repoUrl(normalize(entry.repo()))
                    .build());
            if (entry.tech() != null) {
                for (String technology : entry.tech()) {
                    techStackRepository.save(ProjectTechStack.builder()
                            .project(project)
                            .technology(technology.trim())
                            .build());
                }
            }
        }
    }

    private void replaceSkills(StudentProfile profile, List<String> skills) {
        skillRepository.deleteByStudentProfileId(profile.getId());
        if (skills == null) return;
        for (String skill : skills) {
            skillRepository.save(StudentSkill.builder()
                    .studentProfile(profile)
                    .skillName(skill.trim())
                    .build());
        }
    }

    private StudentProfileResponse toResponse(StudentProfile profile) {
        List<String> skills = skillRepository.findByStudentProfileId(profile.getId()).stream()
                .map(StudentSkill::getSkillName)
            .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<EducationEntry> education = educationRepository
                .findByStudentProfileIdOrderByStartYearDesc(profile.getId()).stream()
                .map(entry -> new EducationEntry(
                        entry.getInstitutionName(), entry.getDegree(),
                        entry.getStartYear() + " – " + (entry.getEndYear() == null ? "Present" : entry.getEndYear()),
                        entry.getGrade()))
                .toList();
        List<ExperienceEntry> experience = experienceRepository
                .findByStudentProfileIdOrderByStartDateDesc(profile.getId()).stream()
                .map(entry -> new ExperienceEntry(
                        entry.getJobRole(), entry.getCompany(),
                        entry.getStartDate() + " – " + (entry.getEndDate() == null ? "Present" : entry.getEndDate()),
                        entry.getDescription()))
                .toList();
        List<ProjectEntry> projects = projectRepository
                .findByStudentProfileIdOrderByCreatedAtDesc(profile.getId()).stream()
                .map(project -> new ProjectEntry(
                        project.getTitle(), project.getDescription(),
                        techStackRepository.findByProjectId(project.getId()).stream()
                                .map(ProjectTechStack::getTechnology).toList(),
                        project.getLiveUrl(), project.getRepoUrl()))
                .toList();

        return new StudentProfileResponse(
                profile.getEmail(), profile.getFullName(), profile.getDegree(), profile.getCollege(),
                profile.getRollNo(), skills, profile.getAbout(),
                new StudentProfileResponse.Contact(profile.getPhone(), profile.getEmail(), profile.getAddress()),
                experience, education, projects, profile.getPlacementStatus().name(),
                profile.getIsOpenToOpportunities(), profile.getCgpa(), profile.getDepartment(), profile.getSemester());
    }

    private short[] parseAcademicYears(String value) {
        Matcher matcher = ACADEMIC_YEARS.matcher(value == null ? "" : value);
        if (!matcher.find()) throw new BadRequestException("Education year must include a four-digit start year");
        short startYear = Short.parseShort(matcher.group());
        short endYear = matcher.find() ? Short.parseShort(matcher.group()) : 0;
        return new short[]{startYear, endYear};
    }

    private LocalDate[] parseExperienceDates(String value) {
        Matcher matcher = EXPERIENCE_DATES.matcher(value == null ? "" : value);
        if (!matcher.matches()) {
            throw new BadRequestException("Experience duration must use YYYY-MM-DD – YYYY-MM-DD or Present");
        }
        try {
            LocalDate start = LocalDate.parse(matcher.group(1));
            LocalDate end = "Present".equals(matcher.group(2)) ? null : LocalDate.parse(matcher.group(2));
            if (end != null && end.isBefore(start)) throw new BadRequestException("Experience end date precedes its start date");
            return new LocalDate[]{start, end};
        } catch (DateTimeParseException ex) {
            throw new BadRequestException("Experience duration contains an invalid date");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}