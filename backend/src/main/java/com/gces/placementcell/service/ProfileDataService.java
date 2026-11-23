package com.gces.placementcell.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.dto.profile.ProfileData.*;
import com.gces.placementcell.dto.profile.ProfileSection;
import com.gces.placementcell.entity.*;
import com.gces.placementcell.entity.enums.DocumentStatus;
import com.gces.placementcell.entity.enums.DocumentType;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.entity.enums.SkillProficiency;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Everything about ProfileData: reading the official profile into it, normalising, comparing,
 * validating, (de)serialising and applying approved sections back onto the official tables.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileDataService {

    private final StudentProfileRepository studentProfileRepository;
    private final StudentSkillRepository skillRepository;
    private final StudentEducationRepository educationRepository;
    private final StudentExperienceRepository experienceRepository;
    private final StudentProjectRepository projectRepository;
    private final StudentCertificationRepository certificationRepository;
    private final StudentAchievementRepository achievementRepository;
    private final StudentDocumentRepository documentRepository;
    private final JobApplicationRepository applicationRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    // ------------------------------------------------------------------ official snapshot

    /** The official (verified) profile of a student, normalised. */
    public ProfileData snapshot(StudentProfile p) {
        Long id = p.getId();
        Personal personal = new Personal(p.getFullName(), p.getPhone(), p.getAddress(), p.getAbout(),
                p.getAvatarUrl(), p.getGithubUrl(), p.getLinkedinUrl(), p.getPortfolioUrl());
        Academic academic = new Academic(p.getCgpa(), p.getTotalBacklogs(), p.getActiveBacklogs(),
                p.getSemester() == null ? null : p.getSemester().intValue());

        List<SkillItem> skills = skillRepository.findByStudentProfileIdOrderBySkillNameAsc(id).stream()
                .map(s -> new SkillItem(s.getId(), s.getSkillName(), s.getProficiency() == null ? null : s.getProficiency().name()))
                .toList();
        List<EducationItem> education = educationRepository.findByStudentProfileIdOrderByStartYearDesc(id).stream()
                .map(e -> new EducationItem(e.getId(), e.getInstitutionName(), e.getDegree(), e.getBoardOrUniversity(),
                        e.getStartYear() == null ? null : e.getStartYear().intValue(),
                        e.getEndYear() == null ? null : e.getEndYear().intValue(), e.getGrade(), e.getIsCurrent()))
                .toList();
        List<ExperienceItem> experience = experienceRepository.findByStudentProfileIdOrderByStartDateDesc(id).stream()
                .map(x -> new ExperienceItem(x.getId(), x.getJobRole(), x.getCompany(),
                        x.getExperienceType() == null ? null : x.getExperienceType().name(), x.getLocation(),
                        x.getStartDate(), x.getEndDate(), x.getIsCurrent(), x.getDescription()))
                .toList();
        List<ProjectItem> projects = projectRepository.findByStudentProfileIdOrderByCreatedAtDesc(id).stream()
                .map(pr -> new ProjectItem(pr.getId(), pr.getTitle(), pr.getDescription(), pr.getLiveUrl(), pr.getRepoUrl(),
                        pr.getMediaUrl(), pr.getTechStack().stream().map(ProjectTechStack::getTechnology).toList()))
                .toList();
        List<CertificationItem> certifications = certificationRepository.findByStudentProfileIdOrderByIdAsc(id).stream()
                .map(c -> new CertificationItem(c.getId(), c.getName(), c.getIssuer(), c.getIssueDate(), c.getExpiryDate(),
                        c.getCredentialId(), c.getCredentialUrl(), c.getFileUrl()))
                .toList();
        List<AchievementItem> achievements = achievementRepository.findByStudentProfileIdOrderByIdAsc(id).stream()
                .map(a -> new AchievementItem(a.getId(), a.getTitle(), a.getDescription(), a.getAchievedOn(), a.getFileUrl()))
                .toList();
        String resumeName = p.getResumeUrl() == null ? null
                : documentRepository.findFirstByStudentIdAndDocumentTypeOrderByUploadedAtDesc(id, DocumentType.RESUME)
                    .map(StudentDocument::getDocumentName).orElse(null);
        Resume resume = new Resume(p.getResumeUrl(), resumeName);
        List<DocumentItem> documents = documentRepository.findByStudentId(id).stream()
                .filter(d -> d.getDocumentType() != DocumentType.RESUME)
                .sorted(Comparator.comparing(StudentDocument::getId))
                .map(d -> new DocumentItem(d.getId(), d.getDocumentName(), d.getDocumentType().name(), d.getFileUrl(), d.getFileSize()))
                .toList();

        return normalize(new ProfileData(personal, academic, skills, education, experience, projects, certifications,
                achievements, resume, documents, List.of()));
    }

    // ------------------------------------------------------------------ normalise / merge / diff

    /** Trims text, turns blanks into null, fills defaults, so equal content compares equal. */
    public ProfileData normalize(ProfileData d) {
        if (d == null) {
            return null;
        }
        Personal p = d.personal();
        Personal personal = p == null ? null : new Personal(text(p.fullName()), text(p.phone()), text(p.address()),
                text(p.about()), text(p.avatarUrl()), text(p.githubUrl()), text(p.linkedinUrl()), text(p.portfolioUrl()));
        Academic a = d.academic();
        Academic academic = a == null ? null : new Academic(
                a.cgpa() == null ? null : a.cgpa().setScale(2, RoundingMode.HALF_UP),
                a.totalBacklogs() == null ? 0 : a.totalBacklogs(),
                a.activeBacklogs() == null ? 0 : a.activeBacklogs(),
                a.semester());
        Resume r = d.resume();
        Resume resume = r == null ? null : new Resume(text(r.resumeUrl()), text(r.fileName()));
        return new ProfileData(personal, academic,
                list(d.skills(), s -> new SkillItem(s.id(), text(s.skillName()), text(s.proficiency()))),
                list(d.education(), e -> new EducationItem(e.id(), text(e.institutionName()), text(e.degree()),
                        text(e.boardOrUniversity()), e.startYear(), Boolean.TRUE.equals(e.isCurrent()) ? null : e.endYear(),
                        text(e.grade()), Boolean.TRUE.equals(e.isCurrent()))),
                list(d.experience(), x -> new ExperienceItem(x.id(), text(x.jobRole()), text(x.company()),
                        x.experienceType() == null || x.experienceType().isBlank() ? ExperienceType.INTERNSHIP.name() : x.experienceType().trim(),
                        text(x.location()), x.startDate(), Boolean.TRUE.equals(x.isCurrent()) ? null : x.endDate(),
                        Boolean.TRUE.equals(x.isCurrent()), text(x.description()))),
                list(d.projects(), pr -> new ProjectItem(pr.id(), text(pr.title()), text(pr.description()), text(pr.liveUrl()),
                        text(pr.repoUrl()), text(pr.mediaUrl()),
                        pr.techStack() == null ? List.of() : pr.techStack().stream().map(ProfileDataService::text)
                                .filter(Objects::nonNull).distinct().sorted().toList())),
                list(d.certifications(), c -> new CertificationItem(c.id(), text(c.name()), text(c.issuer()), c.issueDate(),
                        c.expiryDate(), text(c.credentialId()), text(c.credentialUrl()), text(c.fileUrl()))),
                list(d.achievements(), x -> new AchievementItem(x.id(), text(x.title()), text(x.description()), x.achievedOn(),
                        text(x.fileUrl()))),
                resume,
                list(d.documents(), doc -> new DocumentItem(doc.id(), text(doc.documentName()), text(doc.documentType()),
                        text(doc.fileUrl()), doc.fileSize())),
                list(d.evidence(), ev -> new EvidenceItem(text(ev.section()) == null ? null : ev.section().trim().toUpperCase(Locale.ROOT),
                        text(ev.fileUrl()), text(ev.fileName()), text(ev.contentType()), ev.size(), text(ev.note()))));
    }

    /** Sections the incoming data leaves out (null) are taken from {@code base}. */
    public ProfileData merge(ProfileData base, ProfileData incoming) {
        if (incoming == null) {
            return base;
        }
        return new ProfileData(
                incoming.personal() != null ? incoming.personal() : base.personal(),
                incoming.academic() != null ? incoming.academic() : base.academic(),
                incoming.skills() != null ? incoming.skills() : base.skills(),
                incoming.education() != null ? incoming.education() : base.education(),
                incoming.experience() != null ? incoming.experience() : base.experience(),
                incoming.projects() != null ? incoming.projects() : base.projects(),
                incoming.certifications() != null ? incoming.certifications() : base.certifications(),
                incoming.achievements() != null ? incoming.achievements() : base.achievements(),
                incoming.resume() != null ? incoming.resume() : base.resume(),
                incoming.documents() != null ? incoming.documents() : base.documents(),
                incoming.evidence() != null ? incoming.evidence() : base.evidence());
    }

    /** Sections whose content differs. Both sides must be normalised. List order does not matter. */
    public Set<ProfileSection> diff(ProfileData proposed, ProfileData official) {
        Set<ProfileSection> changed = EnumSet.noneOf(ProfileSection.class);
        if (proposed == null || official == null) {
            return changed;
        }
        compare(changed, ProfileSection.PERSONAL, proposed.personal(), official.personal());
        compare(changed, ProfileSection.ACADEMIC, proposed.academic(), official.academic());
        compareList(changed, ProfileSection.SKILLS, proposed.skills(), official.skills());
        compareList(changed, ProfileSection.EDUCATION, proposed.education(), official.education());
        compareList(changed, ProfileSection.EXPERIENCE, proposed.experience(), official.experience());
        compareList(changed, ProfileSection.PROJECTS, proposed.projects(), official.projects());
        compareList(changed, ProfileSection.CERTIFICATIONS, proposed.certifications(), official.certifications());
        compareList(changed, ProfileSection.ACHIEVEMENTS, proposed.achievements(), official.achievements());
        String newResume = proposed.resume() == null ? null : proposed.resume().resumeUrl();
        String oldResume = official.resume() == null ? null : official.resume().resumeUrl();
        if (!Objects.equals(newResume, oldResume)) {
            changed.add(ProfileSection.RESUME);
        }
        compareList(changed, ProfileSection.DOCUMENTS, proposed.documents(), official.documents());
        return changed;
    }

    private void compare(Set<ProfileSection> changed, ProfileSection section, Object a, Object b) {
        if (!Objects.equals(tree(a), tree(b))) {
            changed.add(section);
        }
    }

    private void compareList(Set<ProfileSection> changed, ProfileSection section, List<?> a, List<?> b) {
        List<String> left = (a == null ? List.of() : a).stream().map(x -> String.valueOf(tree(x))).sorted().toList();
        List<String> right = (b == null ? List.of() : b).stream().map(x -> String.valueOf(tree(x))).sorted().toList();
        if (!left.equals(right)) {
            changed.add(section);
        }
    }

    private JsonNode tree(Object value) {
        return value == null ? null : objectMapper.valueToTree(value);
    }

    // ------------------------------------------------------------------ validation

    /**
     * Rules beyond the field annotations: cross-field checks, duplicates, and that every file the
     * draft points at is either already on the official profile or an upload this student owns.
     */
    public void validate(ProfileData d, Long studentProfileId, ProfileData official) {
        if (d.personal() == null || d.personal().fullName() == null) {
            throw new BadRequestException("Full name is required");
        }
        Academic a = d.academic();
        if (a != null && a.activeBacklogs() != null && a.totalBacklogs() != null && a.activeBacklogs() > a.totalBacklogs()) {
            throw new BadRequestException("Active backlogs cannot be more than total backlogs");
        }
        uniqueIds("skills", d.skills(), SkillItem::id);
        uniqueIds("education", d.education(), EducationItem::id);
        uniqueIds("experience", d.experience(), ExperienceItem::id);
        uniqueIds("projects", d.projects(), ProjectItem::id);
        uniqueIds("certifications", d.certifications(), CertificationItem::id);
        uniqueIds("achievements", d.achievements(), AchievementItem::id);
        uniqueIds("documents", d.documents(), DocumentItem::id);

        Set<String> seen = new HashSet<>();
        for (SkillItem s : d.skills()) {
            if (!seen.add(s.skillName().toLowerCase(Locale.ROOT))) {
                throw new BadRequestException("Duplicate skill: " + s.skillName());
            }
        }
        seen.clear();
        for (ProjectItem p : d.projects()) {
            if (!seen.add(p.title().toLowerCase(Locale.ROOT))) {
                throw new BadRequestException("Duplicate project title: " + p.title());
            }
        }
        for (EducationItem e : d.education()) {
            if (e.endYear() != null && e.startYear() != null && e.endYear() < e.startYear()) {
                throw new BadRequestException("Education end year cannot be before the start year (" + e.institutionName() + ")");
            }
        }
        for (ExperienceItem x : d.experience()) {
            if (x.endDate() != null && x.startDate() != null && x.endDate().isBefore(x.startDate())) {
                throw new BadRequestException("Experience end date cannot be before the start date (" + x.company() + ")");
            }
        }
        for (CertificationItem c : d.certifications()) {
            if (c.expiryDate() != null && c.issueDate() != null && c.expiryDate().isBefore(c.issueDate())) {
                throw new BadRequestException("Certification expiry cannot be before its issue date (" + c.name() + ")");
            }
        }

        Set<String> officialFiles = officialFileUrls(official);
        if (d.personal() != null) {
            checkFile("Avatar", d.personal().avatarUrl(), studentProfileId, officialFiles, true);
        }
        if (d.resume() != null) {
            checkFile("Resume", d.resume().resumeUrl(), studentProfileId, officialFiles, false);
        }
        d.projects().forEach(p -> checkFile("Project media", p.mediaUrl(), studentProfileId, officialFiles, true));
        d.certifications().forEach(c -> checkFile("Certificate file", c.fileUrl(), studentProfileId, officialFiles, false));
        d.achievements().forEach(x -> checkFile("Achievement file", x.fileUrl(), studentProfileId, officialFiles, false));
        d.documents().forEach(doc -> checkFile("Document file", doc.fileUrl(), studentProfileId, officialFiles, false));
        for (EvidenceItem ev : d.evidence()) {
            if (ev.section() != null && !ProfileSection.isValid(ev.section())) {
                throw new BadRequestException("Unknown evidence section: " + ev.section());
            }
            checkFile("Evidence file", ev.fileUrl(), studentProfileId, Set.of(), false);
        }
    }

    private static <T> void uniqueIds(String label, List<T> items, Function<T, Long> id) {
        Set<Long> ids = new HashSet<>();
        for (T item : items) {
            Long value = id.apply(item);
            if (value != null && !ids.add(value)) {
                throw new BadRequestException("Duplicate item id " + value + " in " + label);
            }
        }
    }

    private static void checkFile(String label, String url, Long studentId, Set<String> officialFiles, boolean externalAllowed) {
        if (url == null || officialFiles.contains(url)) {
            return;
        }
        if (VerificationFiles.isOwnedVerificationUrl(url, studentId)) {
            return;
        }
        if (externalAllowed && (url.startsWith("http://") || url.startsWith("https://"))) {
            return;
        }
        throw new BadRequestException(label + " must be a file you uploaded for verification");
    }

    private static Set<String> officialFileUrls(ProfileData o) {
        Set<String> urls = new HashSet<>();
        if (o == null) {
            return urls;
        }
        if (o.personal() != null && o.personal().avatarUrl() != null) urls.add(o.personal().avatarUrl());
        if (o.resume() != null && o.resume().resumeUrl() != null) urls.add(o.resume().resumeUrl());
        o.projects().stream().map(ProjectItem::mediaUrl).filter(Objects::nonNull).forEach(urls::add);
        o.certifications().stream().map(CertificationItem::fileUrl).filter(Objects::nonNull).forEach(urls::add);
        o.achievements().stream().map(AchievementItem::fileUrl).filter(Objects::nonNull).forEach(urls::add);
        o.documents().stream().map(DocumentItem::fileUrl).filter(Objects::nonNull).forEach(urls::add);
        return urls;
    }

    // ------------------------------------------------------------------ JSON

    public String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialise profile data", ex);
        }
    }

    public ProfileData readData(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return normalize(objectMapper.readValue(json, ProfileData.class));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Stored profile data is unreadable", ex);
        }
    }

    public Map<String, String> readComments(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, String>>() { });
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    // ------------------------------------------------------------------ apply (approval)

    /**
     * Writes the given sections of {@code data} onto the official tables (upsert by id: rows whose id
     * is listed are updated, id-less or unknown ids are inserted, official rows missing from the list
     * are deleted). Must run inside the approving transaction.
     */
    public void apply(StudentProfile profile, ProfileData data, Set<ProfileSection> sections, User reviewer) {
        for (ProfileSection section : sections) {
            switch (section) {
                case PERSONAL -> applyPersonal(profile, data.personal());
                case ACADEMIC -> applyAcademic(profile, data.academic());
                case SKILLS -> applySkills(profile, data.skills());
                case EDUCATION -> applyEducation(profile, data.education());
                case EXPERIENCE -> applyExperience(profile, data.experience());
                case PROJECTS -> applyProjects(profile, data.projects());
                case CERTIFICATIONS -> applyCertifications(profile, data.certifications());
                case ACHIEVEMENTS -> applyAchievements(profile, data.achievements());
                case RESUME -> applyResume(profile, data.resume(), reviewer);
                case DOCUMENTS -> applyDocuments(profile, data.documents(), reviewer);
            }
        }
        profile.setProfileCompletionPercent(StudentAccountService.completionPercent(profile));
        studentProfileRepository.save(profile);
    }

    private void applyPersonal(StudentProfile p, Personal personal) {
        if (personal == null) {
            return;
        }
        p.setFullName(personal.fullName());
        p.setPhone(personal.phone());
        p.setAddress(personal.address());
        p.setAbout(personal.about());
        p.setAvatarUrl(personal.avatarUrl());
        p.setGithubUrl(personal.githubUrl());
        p.setLinkedinUrl(personal.linkedinUrl());
        p.setPortfolioUrl(personal.portfolioUrl());
    }

    private void applyAcademic(StudentProfile p, Academic a) {
        if (a == null) {
            return;
        }
        int total = a.totalBacklogs() == null ? 0 : a.totalBacklogs();
        int active = a.activeBacklogs() == null ? 0 : a.activeBacklogs();
        if (active > total) {
            throw new BadRequestException("Active backlogs cannot be more than total backlogs");
        }
        p.setCgpa(a.cgpa());
        p.setTotalBacklogs(total);
        p.setActiveBacklogs(active);
        p.setSemester(a.semester() == null ? null : a.semester().shortValue());
    }

    private void applySkills(StudentProfile p, List<SkillItem> items) {
        Map<Long, StudentSkill> official = byId(skillRepository.findByStudentProfileId(p.getId()), StudentSkill::getId);
        Set<Long> kept = keptIds(items, SkillItem::id, official.keySet());
        official.values().stream().filter(s -> !kept.contains(s.getId())).forEach(skillRepository::delete);
        skillRepository.flush();
        // Two passes for renamed rows, so swapping names cannot trip the (student, skill_name) unique key.
        for (SkillItem item : items) {
            StudentSkill s = item.id() == null ? null : official.get(item.id());
            if (s != null && !s.getSkillName().equals(item.skillName())) {
                s.setSkillName("~" + s.getId());
            }
        }
        skillRepository.flush();
        for (SkillItem item : items) {
            StudentSkill s = item.id() == null ? null : official.get(item.id());
            if (s != null) {
                s.setSkillName(item.skillName());
                s.setProficiency(proficiency(item.proficiency()));
            }
        }
        skillRepository.flush();
        for (SkillItem item : items) {
            if (item.id() == null || !official.containsKey(item.id())) {
                skillRepository.save(StudentSkill.builder().studentProfile(p).skillName(item.skillName())
                        .proficiency(proficiency(item.proficiency())).build());
            }
        }
        skillRepository.flush();
    }

    private static SkillProficiency proficiency(String value) {
        return value == null ? SkillProficiency.INTERMEDIATE : SkillProficiency.valueOf(value);
    }

    private void applyEducation(StudentProfile p, List<EducationItem> items) {
        Map<Long, StudentEducation> official = byId(educationRepository.findByStudentProfileId(p.getId()), StudentEducation::getId);
        Set<Long> kept = keptIds(items, EducationItem::id, official.keySet());
        official.values().stream().filter(e -> !kept.contains(e.getId())).forEach(educationRepository::delete);
        educationRepository.flush();
        for (EducationItem item : items) {
            StudentEducation e = item.id() == null ? null : official.get(item.id());
            if (e == null) {
                e = StudentEducation.builder().studentProfile(p).build();
            }
            e.setInstitutionName(item.institutionName());
            e.setDegree(item.degree());
            e.setBoardOrUniversity(item.boardOrUniversity());
            e.setStartYear(item.startYear().shortValue());
            e.setEndYear(item.endYear() == null ? null : item.endYear().shortValue());
            e.setGrade(item.grade());
            e.setIsCurrent(Boolean.TRUE.equals(item.isCurrent()));
            educationRepository.save(e);
        }
        educationRepository.flush();
    }

    private void applyExperience(StudentProfile p, List<ExperienceItem> items) {
        Map<Long, StudentExperience> official = byId(experienceRepository.findByStudentProfileId(p.getId()), StudentExperience::getId);
        Set<Long> kept = keptIds(items, ExperienceItem::id, official.keySet());
        official.values().stream().filter(x -> !kept.contains(x.getId())).forEach(experienceRepository::delete);
        experienceRepository.flush();
        for (ExperienceItem item : items) {
            StudentExperience x = item.id() == null ? null : official.get(item.id());
            if (x == null) {
                x = StudentExperience.builder().studentProfile(p).build();
            }
            x.setJobRole(item.jobRole());
            x.setCompany(item.company());
            x.setExperienceType(item.experienceType() == null ? ExperienceType.INTERNSHIP : ExperienceType.valueOf(item.experienceType()));
            x.setLocation(item.location());
            x.setStartDate(item.startDate());
            x.setEndDate(item.endDate());
            x.setIsCurrent(Boolean.TRUE.equals(item.isCurrent()));
            x.setDescription(item.description());
            experienceRepository.save(x);
        }
        experienceRepository.flush();
    }

    private void applyProjects(StudentProfile p, List<ProjectItem> items) {
        Map<Long, StudentProject> official = byId(projectRepository.findByStudentProfileId(p.getId()), StudentProject::getId);
        Set<Long> kept = keptIds(items, ProjectItem::id, official.keySet());
        official.values().stream().filter(pr -> !kept.contains(pr.getId())).forEach(projectRepository::delete);
        projectRepository.flush();
        for (ProjectItem item : items) {
            StudentProject pr = item.id() == null ? null : official.get(item.id());
            if (pr != null && !pr.getTitle().equals(item.title())) {
                pr.setTitle("~" + pr.getId());
            }
        }
        projectRepository.flush();
        for (ProjectItem item : items) {
            StudentProject pr = item.id() == null ? null : official.get(item.id());
            if (pr == null) {
                continue;
            }
            pr.setTitle(item.title());
            pr.setDescription(item.description());
            pr.setLiveUrl(item.liveUrl());
            pr.setRepoUrl(item.repoUrl());
            pr.setMediaUrl(item.mediaUrl());
            Set<String> wanted = new LinkedHashSet<>(item.techStack() == null ? List.of() : item.techStack());
            pr.getTechStack().removeIf(t -> !wanted.contains(t.getTechnology()));
            Set<String> present = pr.getTechStack().stream().map(ProjectTechStack::getTechnology).collect(Collectors.toSet());
            wanted.stream().filter(t -> !present.contains(t)).forEach(pr::addTechnology);
            projectRepository.save(pr);
        }
        projectRepository.flush();
        for (ProjectItem item : items) {
            if (item.id() != null && official.containsKey(item.id())) {
                continue;
            }
            StudentProject pr = StudentProject.builder().studentProfile(p).title(item.title()).description(item.description())
                    .liveUrl(item.liveUrl()).repoUrl(item.repoUrl()).mediaUrl(item.mediaUrl()).build();
            (item.techStack() == null ? List.<String>of() : item.techStack()).forEach(pr::addTechnology);
            projectRepository.save(pr);
        }
        projectRepository.flush();
    }

    private void applyCertifications(StudentProfile p, List<CertificationItem> items) {
        Map<Long, StudentCertification> official = byId(certificationRepository.findByStudentProfileIdOrderByIdAsc(p.getId()), StudentCertification::getId);
        Set<Long> kept = keptIds(items, CertificationItem::id, official.keySet());
        official.values().stream().filter(c -> !kept.contains(c.getId())).forEach(certificationRepository::delete);
        certificationRepository.flush();
        for (CertificationItem item : items) {
            StudentCertification c = item.id() == null ? null : official.get(item.id());
            if (c == null) {
                c = StudentCertification.builder().studentProfile(p).build();
            }
            c.setName(item.name());
            c.setIssuer(item.issuer());
            c.setIssueDate(item.issueDate());
            c.setExpiryDate(item.expiryDate());
            c.setCredentialId(item.credentialId());
            c.setCredentialUrl(item.credentialUrl());
            c.setFileUrl(item.fileUrl());
            certificationRepository.save(c);
        }
        certificationRepository.flush();
    }

    private void applyAchievements(StudentProfile p, List<AchievementItem> items) {
        Map<Long, StudentAchievement> official = byId(achievementRepository.findByStudentProfileIdOrderByIdAsc(p.getId()), StudentAchievement::getId);
        Set<Long> kept = keptIds(items, AchievementItem::id, official.keySet());
        official.values().stream().filter(a -> !kept.contains(a.getId())).forEach(achievementRepository::delete);
        achievementRepository.flush();
        for (AchievementItem item : items) {
            StudentAchievement a = item.id() == null ? null : official.get(item.id());
            if (a == null) {
                a = StudentAchievement.builder().studentProfile(p).build();
            }
            a.setTitle(item.title());
            a.setDescription(item.description());
            a.setAchievedOn(item.achievedOn());
            a.setFileUrl(item.fileUrl());
            achievementRepository.save(a);
        }
        achievementRepository.flush();
    }

    private void applyResume(StudentProfile p, Resume resume, User reviewer) {
        String newUrl = resume == null ? null : resume.resumeUrl();
        String oldUrl = p.getResumeUrl();
        p.setResumeUrl(newUrl);
        documentRepository.findByStudentIdAndDocumentType(p.getId(), DocumentType.RESUME).forEach(documentRepository::delete);
        documentRepository.flush();
        if (newUrl != null) {
            String name = resume.fileName();
            if (name == null) {
                String[] parts = VerificationFiles.parseFileUrl(newUrl);
                name = parts != null ? parts[1] : "Resume";
            }
            documentRepository.save(StudentDocument.builder()
                    .student(p)
                    .documentType(DocumentType.RESUME)
                    .documentName(name.length() > 150 ? name.substring(0, 150) : name)
                    .fileUrl(newUrl)
                    .status(DocumentStatus.VERIFIED)
                    .verifiedBy(reviewer != null ? reviewer.getId() : null)
                    .verifiedAt(LocalDateTime.now())
                    .build());
        }
        if (oldUrl != null && !oldUrl.equals(newUrl)) {
            deleteAfterCommitIfUnreferenced(p.getId(), oldUrl);
        }
    }

    /** The replaced resume file is removed once the approval commits, unless an application still uses it. */
    private void deleteAfterCommitIfUnreferenced(Long studentId, String url) {
        String[] parts = VerificationFiles.parseFileUrl(url);
        if (parts == null || applicationRepository.existsByStudentProfileIdAndResumeUrlEndingWith(studentId, "/" + parts[1])) {
            return;
        }
        Runnable delete = () -> {
            try {
                fileStorageService.deleteFile(parts[0], parts[1]);
            } catch (RuntimeException ex) {
                log.warn("Could not delete replaced resume file for student {}: {}", studentId, ex.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    delete.run();
                }
            });
        } else {
            delete.run();
        }
    }

    private void applyDocuments(StudentProfile p, List<DocumentItem> items, User reviewer) {
        Map<Long, StudentDocument> official = byId(documentRepository.findByStudentId(p.getId()).stream()
                .filter(d -> d.getDocumentType() != DocumentType.RESUME).toList(), StudentDocument::getId);
        Set<Long> kept = keptIds(items, DocumentItem::id, official.keySet());
        official.values().stream().filter(d -> !kept.contains(d.getId())).forEach(documentRepository::delete);
        documentRepository.flush();
        LocalDateTime now = LocalDateTime.now();
        for (DocumentItem item : items) {
            StudentDocument doc = item.id() == null ? null : official.get(item.id());
            if (doc == null) {
                doc = StudentDocument.builder().student(p).build();
            }
            doc.setDocumentName(item.documentName());
            doc.setDocumentType(DocumentType.valueOf(item.documentType()));
            doc.setFileUrl(item.fileUrl());
            doc.setFileSize(item.fileSize());
            doc.setStatus(DocumentStatus.VERIFIED);
            doc.setVerifiedBy(reviewer != null ? reviewer.getId() : null);
            doc.setVerifiedAt(now);
            documentRepository.save(doc);
        }
        documentRepository.flush();
    }

    // ------------------------------------------------------------------ helpers

    private static <T> Map<Long, T> byId(List<T> rows, Function<T, Long> id) {
        Map<Long, T> map = new LinkedHashMap<>();
        rows.forEach(r -> map.put(id.apply(r), r));
        return map;
    }

    /** Ids of the items that refer to an existing official row (others are treated as new). */
    private static <T> Set<Long> keptIds(List<T> items, Function<T, Long> id, Set<Long> official) {
        return (items == null ? List.<T>of() : items).stream().map(id).filter(Objects::nonNull)
                .filter(official::contains).collect(Collectors.toSet());
    }

    private static <T> List<T> list(List<T> items, Function<T, T> mapper) {
        return items == null ? List.of() : items.stream().filter(Objects::nonNull).map(mapper).toList();
    }

    private static String text(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
