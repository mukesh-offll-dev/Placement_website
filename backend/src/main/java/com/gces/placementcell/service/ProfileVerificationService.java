package com.gces.placementcell.service;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.profile.ProfileData;
import com.gces.placementcell.dto.profile.ProfileSection;
import com.gces.placementcell.dto.request.RejectVersionRequest;
import com.gces.placementcell.dto.request.SaveDraftRequest;
import com.gces.placementcell.dto.response.DraftResponse;
import com.gces.placementcell.dto.response.FacultyDashboardResponse;
import com.gces.placementcell.dto.response.PagedResponse;
import com.gces.placementcell.dto.response.VerificationCounts;
import com.gces.placementcell.dto.response.VerificationFileResponse;
import com.gces.placementcell.dto.response.VersionDetail;
import com.gces.placementcell.dto.response.VersionSummary;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.ProfileVerificationEvent;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProfileVersion;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.LifecycleStatus;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;
import com.gces.placementcell.entity.enums.ProfileVersionStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.entity.enums.VerificationAction;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ConflictException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.ProfileVerificationEventRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProfileVersionRepository;
import com.gces.placementcell.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Profile verification: the student's draft (one working DRAFT/PENDING version at a time), submit,
 * withdraw and discard, and the faculty/admin review. Official data changes only on approval.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileVerificationService {

    private static final Set<ProfileVersionStatus> WORKING = EnumSet.of(ProfileVersionStatus.DRAFT, ProfileVersionStatus.PENDING);
    private static final Set<ProfileVersionStatus> REVIEWABLE = EnumSet.of(ProfileVersionStatus.PENDING,
            ProfileVersionStatus.APPROVED, ProfileVersionStatus.REJECTED, ProfileVersionStatus.WITHDRAWN);
    private static final int MAX_PAGE_SIZE = 100;

    private final StudentProfileRepository studentProfileRepository;
    private final StudentProfileVersionRepository versionRepository;
    private final ProfileVerificationEventRepository eventRepository;
    private final FacultyProfileRepository facultyProfileRepository;
    private final UserRepository userRepository;
    private final ProfileDataService profileDataService;
    private final FileStorageService fileStorageService;
    private final FileStorageProperties fileStorageProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditService auditService;
    private final UserDisplayNames displayNames;

    // =================================================================== student side

    @Transactional(readOnly = true)
    public DraftResponse getDraft(String email) {
        StudentProfile profile = findStudent(email);
        return draftResponse(profile);
    }

    @Transactional
    public DraftResponse saveDraft(String email, SaveDraftRequest request) {
        StudentProfile profile = findStudent(email);
        requireEditable(profile);
        Optional<StudentProfileVersion> working = workingVersion(profile);
        if (working.isPresent() && working.get().getStatus() == ProfileVersionStatus.PENDING) {
            throw new ConflictException("Withdraw your pending request before editing");
        }
        ProfileData official = profileDataService.snapshot(profile);
        ProfileData base = working.map(v -> profileDataService.readData(v.getData()))
                .orElseGet(() -> latestRejected(profile).map(v -> profileDataService.readData(v.getData())).orElse(official));
        ProfileData merged = profileDataService.normalize(profileDataService.merge(base, request.data()));
        profileDataService.validate(merged, profile.getId(), official);

        StudentProfileVersion version = working.orElseGet(() -> newVersion(profile, ProfileVersionStatus.DRAFT));
        version.setData(profileDataService.toJson(merged));
        if (request.studentNote() != null) {
            version.setStudentNote(blankToNull(request.studentNote()));
        }
        boolean created = version.getId() == null;
        version = versionRepository.save(version);
        if (created) {
            event(version, VerificationAction.CREATED, profile.getUser(), null);
        }
        return draftResponse(profile);
    }

    @Transactional
    public void discardDraft(String email) {
        StudentProfile profile = findStudent(email);
        requireEditable(profile);
        StudentProfileVersion version = workingVersion(profile)
                .orElseThrow(() -> new ResourceNotFoundException("There is no draft to discard"));
        if (version.getStatus() == ProfileVersionStatus.PENDING) {
            throw new ConflictException("Withdraw your pending request before discarding it");
        }
        version.setStatus(ProfileVersionStatus.DISCARDED);
        versionRepository.save(version);
        event(version, VerificationAction.DISCARDED, profile.getUser(), null);
    }

    @Transactional
    public DraftResponse submit(String email, String studentNote) {
        StudentProfile profile = findStudent(email);
        requireEditable(profile);
        StudentProfileVersion version = workingVersion(profile)
                .orElseThrow(() -> new BadRequestException("Nothing to submit"));
        if (version.getStatus() == ProfileVersionStatus.PENDING) {
            throw new ConflictException("Your changes are already waiting for verification");
        }
        ProfileData official = profileDataService.snapshot(profile);
        ProfileData proposed = profileDataService.readData(version.getData());
        profileDataService.validate(proposed, profile.getId(), official);
        Set<ProfileSection> changed = profileDataService.diff(proposed, official);
        if (changed.isEmpty()) {
            throw new BadRequestException("Nothing to submit");
        }
        version.setStatus(ProfileVersionStatus.PENDING);
        version.setBaseData(profileDataService.toJson(official));
        version.setChangedSections(ProfileSection.join(changed));
        if (studentNote != null) {
            version.setStudentNote(blankToNull(studentNote));
        }
        version.setSubmittedAt(LocalDateTime.now());
        versionRepository.save(version);
        event(version, VerificationAction.SUBMITTED, profile.getUser(), version.getStudentNote());
        profile.setProfileVerificationStatus(ProfileVerificationStatus.PENDING);
        studentProfileRepository.save(profile);
        notifyReviewers(profile, version);
        return draftResponse(profile);
    }

    @Transactional
    public DraftResponse withdraw(String email) {
        StudentProfile profile = findStudent(email);
        requireEditable(profile);
        StudentProfileVersion pending = workingVersion(profile)
                .filter(v -> v.getStatus() == ProfileVersionStatus.PENDING)
                .orElseThrow(() -> new ConflictException("There is no pending request to withdraw"));
        pending.setStatus(ProfileVersionStatus.WITHDRAWN);
        versionRepository.save(pending);
        event(pending, VerificationAction.WITHDRAWN, profile.getUser(), null);

        StudentProfileVersion copy = newVersion(profile, ProfileVersionStatus.DRAFT);
        copy.setData(pending.getData());
        copy.setStudentNote(pending.getStudentNote());
        copy = versionRepository.save(copy);
        event(copy, VerificationAction.CREATED, profile.getUser(), "Copied from withdrawn version " + pending.getVersionNumber());

        profile.setProfileVerificationStatus(statusFromHistory(profile));
        studentProfileRepository.save(profile);
        return draftResponse(profile);
    }

    @Transactional(readOnly = true)
    public List<VersionSummary> myVersions(String email) {
        StudentProfile profile = findStudent(email);
        return versionRepository.findByStudentIdOrderByVersionNumberDesc(profile.getId()).stream()
                .map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public VersionDetail myVersion(String email, Long id) {
        StudentProfile profile = findStudent(email);
        StudentProfileVersion version = versionRepository.findById(id)
                .filter(v -> v.getStudent().getId().equals(profile.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Verification request", "id", id));
        return detail(version);
    }

    @Transactional
    public VerificationFileResponse uploadFile(String email, MultipartFile file, String section) {
        StudentProfile profile = findStudent(email);
        requireEditable(profile);
        if (section != null && !section.isBlank() && !ProfileSection.isValid(section)) {
            throw new BadRequestException("Unknown section: " + section);
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }
        String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String stored = fileStorageService.storeFile(new OwnedFile(file, VerificationFiles.ownerPrefix(profile.getId()) + original),
                VerificationFiles.CATEGORY, VerificationFiles.ALLOWED_EXTENSIONS, fileStorageProperties.getMaxResumeSize());
        String cleanName = original.replaceAll("[\\r\\n\\\\/]", "_");
        return new VerificationFileResponse(VerificationFiles.urlFor(stored),
                cleanName.length() > 255 ? cleanName.substring(0, 255) : cleanName,
                fileStorageService.getContentType(stored), file.getSize());
    }

    // =================================================================== reviewer side

    /**
     * @param scope         department scope (faculty) or all departments (admin)
     * @param status        PENDING (default), APPROVED, REJECTED or ALL
     * @param departmentCode extra filter for admins; ignored when the scope is a department
     */
    @Transactional(readOnly = true)
    public PagedResponse<VersionSummary> list(StudentScope scope, String status, String search, String departmentCode,
                                              int page, int size) {
        Set<ProfileVersionStatus> statuses = parseListStatus(status);
        String code = scope.isDepartmentScoped() ? scope.departmentCode()
                : (StringUtils.hasText(departmentCode) ? departmentCode.trim().toUpperCase(Locale.ROOT) : null);
        Specification<StudentProfileVersion> spec = (root, query, cb) -> {
            Join<StudentProfileVersion, StudentProfile> student = root.join("student");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(root.get("status").in(statuses));
            if (code != null) {
                predicates.add(cb.equal(cb.upper(student.get("departmentCode")), code));
            }
            if (StringUtils.hasText(search)) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(cb.like(cb.lower(student.get("fullName")), pattern),
                        cb.like(cb.lower(student.get("rollNo")), pattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int validSize = size > 0 ? Math.min(size, MAX_PAGE_SIZE) : 20;
        Page<StudentProfileVersion> rows = versionRepository.findAll(spec,
                PageRequest.of(Math.max(0, page), validSize, Sort.by(Sort.Direction.DESC, "submittedAt", "id")));
        return PagedResponse.of(rows, this::summary);
    }

    @Transactional(readOnly = true)
    public VerificationCounts counts(StudentScope scope) {
        Map<ProfileVersionStatus, Long> counts = new EnumMap<>(ProfileVersionStatus.class);
        for (Object[] row : versionRepository.countByStatusForDepartment(scope.departmentCode())) {
            counts.put((ProfileVersionStatus) row[0], ((Number) row[1]).longValue());
        }
        return new VerificationCounts(counts.getOrDefault(ProfileVersionStatus.PENDING, 0L),
                counts.getOrDefault(ProfileVersionStatus.APPROVED, 0L),
                counts.getOrDefault(ProfileVersionStatus.REJECTED, 0L));
    }

    @Transactional(readOnly = true)
    public VersionDetail reviewDetail(StudentScope scope, Long id) {
        return detail(findForReview(scope, id, false));
    }

    @Transactional
    public VersionDetail approve(StudentScope scope, Long id, String comment) {
        StudentProfileVersion version = findForReview(scope, id, true);
        requirePending(version);
        User reviewer = auditService.currentUser().orElseThrow(() -> new AccessDeniedException("Sign in again"));
        StudentProfile profile = version.getStudent();
        ProfileData proposed = profileDataService.readData(version.getData());
        Set<ProfileSection> sections = ProfileSection.parse(version.getChangedSections());

        profileDataService.apply(profile, proposed, sections, reviewer);

        LocalDateTime now = LocalDateTime.now();
        version.setStatus(ProfileVersionStatus.APPROVED);
        version.setReviewedBy(reviewer);
        version.setReviewedAt(now);
        version.setReviewComment(blankToNull(comment));
        versionRepository.save(version);
        event(version, VerificationAction.APPROVED, reviewer, blankToNull(comment));

        profile.setProfileVerificationStatus(ProfileVerificationStatus.VERIFIED);
        profile.setProfileVerifiedAt(now);
        studentProfileRepository.save(profile);

        auditService.record(reviewer, "VERIFICATION_APPROVE", "PROFILE_VERSION", version.getId(),
                "student=" + profile.getId() + ", sections=" + version.getChangedSections());
        notifyStudent(profile, reviewer, "Profile changes approved",
                "Your profile changes (" + readable(sections) + ") were approved and are now on your official profile."
                        + (StringUtils.hasText(comment) ? " Comment: " + comment.trim() : ""));
        return detail(version);
    }

    @Transactional
    public VersionDetail reject(StudentScope scope, Long id, RejectVersionRequest request) {
        if (request == null || !StringUtils.hasText(request.comment())) {
            throw new BadRequestException("A comment is required when rejecting");
        }
        Map<String, String> sectionComments = new LinkedHashMap<>();
        if (request.sectionComments() != null) {
            request.sectionComments().forEach((key, value) -> {
                if (!ProfileSection.isValid(key)) {
                    throw new BadRequestException("Unknown section: " + key);
                }
                if (StringUtils.hasText(value)) {
                    sectionComments.put(key.trim().toUpperCase(Locale.ROOT), value.trim());
                }
            });
        }
        StudentProfileVersion version = findForReview(scope, id, true);
        requirePending(version);
        User reviewer = auditService.currentUser().orElseThrow(() -> new AccessDeniedException("Sign in again"));
        StudentProfile profile = version.getStudent();

        version.setStatus(ProfileVersionStatus.REJECTED);
        version.setReviewedBy(reviewer);
        version.setReviewedAt(LocalDateTime.now());
        version.setReviewComment(request.comment().trim());
        version.setSectionComments(sectionComments.isEmpty() ? null : profileDataService.toJson(sectionComments));
        versionRepository.save(version);
        event(version, VerificationAction.REJECTED, reviewer, request.comment().trim());

        profile.setProfileVerificationStatus(ProfileVerificationStatus.REJECTED);
        studentProfileRepository.save(profile);

        auditService.record(reviewer, "VERIFICATION_REJECT", "PROFILE_VERSION", version.getId(),
                "student=" + profile.getId());
        notifyStudent(profile, reviewer, "Profile changes need corrections",
                "Your profile changes were not approved: " + request.comment().trim()
                        + " Edit your profile and submit it again.");
        return detail(version);
    }

    /** Dashboard for a faculty advisor's department. */
    @Transactional(readOnly = true)
    public FacultyDashboardResponse dashboard(FacultyProfile faculty) {
        String code = faculty.getDepartment().getCode();
        long active = 0, disabled = 0, archived = 0, verified = 0, pending = 0, rejected = 0, notSubmitted = 0;
        for (Object[] row : studentProfileRepository.countByLifecycleAndVerificationForDepartment(code)) {
            LifecycleStatus lifecycle = (LifecycleStatus) row[0];
            ProfileVerificationStatus status = (ProfileVerificationStatus) row[1];
            long count = ((Number) row[2]).longValue();
            switch (lifecycle) {
                case ACTIVE -> active += count;
                case DISABLED -> disabled += count;
                case ARCHIVED -> archived += count;
            }
            if (lifecycle == LifecycleStatus.ARCHIVED) {
                continue;
            }
            switch (status) {
                case VERIFIED -> verified += count;
                case PENDING -> pending += count;
                case REJECTED -> rejected += count;
                case NOT_SUBMITTED -> notSubmitted += count;
            }
        }
        // Pending requests counted from the requests themselves (archived students' too: they can still be decided).
        long pendingRequests = counts(StudentScope.faculty(code)).pending();
        List<FacultyDashboardResponse.Activity> activity = eventRepository
                .findRecentForDepartment(code, PageRequest.of(0, 15)).stream()
                .map(e -> new FacultyDashboardResponse.Activity(e.getVersion().getId(), e.getVersion().getStudent().getId(),
                        e.getVersion().getStudent().getFullName(), e.getVersion().getStudent().getRollNo(),
                        e.getAction().name(), displayNames.nameOf(e.getActor()), e.getComment(), e.getCreatedAt()))
                .toList();
        return new FacultyDashboardResponse(com.gces.placementcell.dto.response.DepartmentRef.from(faculty.getDepartment()),
                active + disabled, active, disabled, archived, verified, Math.max(pendingRequests, pending), rejected,
                notSubmitted, activity);
    }

    // =================================================================== helpers

    private DraftResponse draftResponse(StudentProfile profile) {
        ProfileData official = profileDataService.snapshot(profile);
        boolean editable = isEditable(profile);
        Optional<StudentProfileVersion> working = workingVersion(profile);
        if (working.isPresent()) {
            StudentProfileVersion v = working.get();
            ProfileData data = profileDataService.readData(v.getData());
            boolean pending = v.getStatus() == ProfileVersionStatus.PENDING;
            List<String> changed = pending ? names(ProfileSection.parse(v.getChangedSections()))
                    : names(profileDataService.diff(data, official));
            return new DraftResponse(v.getId(), v.getVersionNumber(), v.getStatus().name(), data, official, changed,
                    null, Map.of(), v.getSubmittedAt(), v.getUpdatedAt(), editable && !pending,
                    editable && !pending && !changed.isEmpty(), profile.effectiveLifecycle(),
                    profile.getProfileVerificationStatus());
        }
        Optional<StudentProfileVersion> rejected = latestRejected(profile);
        if (rejected.isPresent()) {
            StudentProfileVersion v = rejected.get();
            ProfileData data = profileDataService.readData(v.getData());
            return new DraftResponse(v.getId(), v.getVersionNumber(), "REJECTED", data, official,
                    names(profileDataService.diff(data, official)), v.getReviewComment(),
                    profileDataService.readComments(v.getSectionComments()), v.getSubmittedAt(), v.getUpdatedAt(),
                    editable, false, profile.effectiveLifecycle(), profile.getProfileVerificationStatus());
        }
        return new DraftResponse(null, null, "NONE", official, official, List.of(), null, Map.of(), null, null,
                editable, false, profile.effectiveLifecycle(), profile.getProfileVerificationStatus());
    }

    private Optional<StudentProfileVersion> workingVersion(StudentProfile profile) {
        return versionRepository.findFirstByStudentIdAndStatusInOrderByVersionNumberDesc(profile.getId(), WORKING);
    }

    /** The latest version overall, when it is REJECTED (and so the student should correct it). */
    private Optional<StudentProfileVersion> latestRejected(StudentProfile profile) {
        return versionRepository.findFirstByStudentIdOrderByVersionNumberDesc(profile.getId())
                .filter(v -> v.getStatus() == ProfileVersionStatus.REJECTED);
    }

    private ProfileVerificationStatus statusFromHistory(StudentProfile profile) {
        return versionRepository.findFirstByStudentIdAndStatusInOrderByVersionNumberDesc(profile.getId(),
                        EnumSet.of(ProfileVersionStatus.APPROVED, ProfileVersionStatus.REJECTED))
                .map(v -> v.getStatus() == ProfileVersionStatus.APPROVED ? ProfileVerificationStatus.VERIFIED
                        : ProfileVerificationStatus.REJECTED)
                .orElse(ProfileVerificationStatus.NOT_SUBMITTED);
    }

    private StudentProfileVersion newVersion(StudentProfile profile, ProfileVersionStatus status) {
        return StudentProfileVersion.builder()
                .student(profile)
                .versionNumber(versionRepository.findMaxVersionNumber(profile.getId()) + 1)
                .status(status)
                .build();
    }

    private void event(StudentProfileVersion version, VerificationAction action, User actor, String comment) {
        eventRepository.save(ProfileVerificationEvent.builder()
                .version(version)
                .action(action)
                .actor(actor)
                .actorRole(actor != null && actor.getRole() != null ? actor.getRole().name() : null)
                .comment(comment != null && comment.length() > 2000 ? comment.substring(0, 2000) : comment)
                .build());
    }

    private static boolean isEditable(StudentProfile profile) {
        User user = profile.getUser();
        return profile.effectiveLifecycle() == LifecycleStatus.ACTIVE && user != null
                && Boolean.TRUE.equals(user.getIsActive()) && !Boolean.TRUE.equals(user.getIsDeleted());
    }

    private static void requireEditable(StudentProfile profile) {
        if (profile.effectiveLifecycle() == LifecycleStatus.ARCHIVED) {
            throw new AccessDeniedException("Your account is archived");
        }
        if (!isEditable(profile)) {
            throw new AccessDeniedException("Your account is not active");
        }
    }

    private static void requirePending(StudentProfileVersion version) {
        if (version.getStatus() != ProfileVersionStatus.PENDING) {
            throw new ConflictException("This request is no longer pending");
        }
    }

    /** A version the reviewer may see: in scope and not a private draft. */
    private StudentProfileVersion findForReview(StudentScope scope, Long id, boolean lock) {
        Optional<StudentProfileVersion> found = lock ? versionRepository.findByIdForUpdate(id) : versionRepository.findById(id);
        return found.filter(v -> REVIEWABLE.contains(v.getStatus()))
                .filter(v -> scope.allows(v.getStudent()))
                .orElseThrow(() -> new ResourceNotFoundException("Verification request", "id", id));
    }

    private static Set<ProfileVersionStatus> parseListStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return EnumSet.of(ProfileVersionStatus.PENDING);
        }
        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case "PENDING" -> EnumSet.of(ProfileVersionStatus.PENDING);
            case "APPROVED" -> EnumSet.of(ProfileVersionStatus.APPROVED);
            case "REJECTED" -> EnumSet.of(ProfileVersionStatus.REJECTED);
            case "WITHDRAWN" -> EnumSet.of(ProfileVersionStatus.WITHDRAWN);
            case "ALL" -> REVIEWABLE;
            default -> throw new BadRequestException("status must be PENDING, APPROVED, REJECTED or ALL");
        };
    }

    private VersionSummary summary(StudentProfileVersion v) {
        StudentProfile s = v.getStudent();
        return new VersionSummary(v.getId(), v.getVersionNumber(), v.getStatus(), s.getId(), s.getFullName(), s.getRollNo(),
                s.getDepartmentCode(), s.getBatch(), names(ProfileSection.parse(v.getChangedSections())), v.getSubmittedAt(),
                v.getReviewedAt(), displayNames.nameOf(v.getReviewedBy()), v.getReviewComment());
    }

    private VersionDetail detail(StudentProfileVersion v) {
        StudentProfile s = v.getStudent();
        ProfileData proposed = profileDataService.readData(v.getData());
        ProfileData current = profileDataService.snapshot(s);
        List<String> changed = v.getChangedSections() != null ? names(ProfileSection.parse(v.getChangedSections()))
                : names(profileDataService.diff(proposed, current));
        List<VersionDetail.Event> events = eventRepository.findByVersionIdOrderByCreatedAtAscIdAsc(v.getId()).stream()
                .map(e -> new VersionDetail.Event(e.getAction().name(), displayNames.nameOf(e.getActor()), e.getActorRole(),
                        e.getComment(), e.getCreatedAt()))
                .toList();
        return new VersionDetail(v.getId(), v.getVersionNumber(), v.getStatus(), s.getId(), s.getFullName(), s.getRollNo(),
                s.getDepartmentCode(), s.getBatch(), changed, v.getSubmittedAt(), v.getReviewedAt(),
                displayNames.nameOf(v.getReviewedBy()), v.getReviewComment(), v.getStudentNote(), proposed,
                profileDataService.readData(v.getBaseData()), current, profileDataService.readComments(v.getSectionComments()),
                proposed == null ? List.of() : proposed.evidence(), events);
    }

    /** The department's active advisor, or every active admin when the department has none. */
    private void notifyReviewers(StudentProfile profile, StudentProfileVersion version) {
        List<FacultyProfile> advisors = profile.getDepartmentCode() == null ? List.of()
                : facultyProfileRepository.findActiveByDepartmentCode(profile.getDepartmentCode());
        String title = "Profile verification request: " + profile.getFullName()
                + (profile.getRollNo() != null ? " (" + profile.getRollNo() + ")" : "");
        String message = profile.getFullName() + " submitted profile changes for verification ("
                + readable(ProfileSection.parse(version.getChangedSections())) + ").";
        Long sender = profile.getUser().getId();
        if (!advisors.isEmpty()) {
            publish(advisors.stream().map(f -> f.getUser().getId()).toList(), sender, title, message,
                    "/faculty/verifications/" + version.getId());
        } else {
            List<Long> admins = userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN).stream()
                    .map(User::getId).toList();
            publish(admins, sender, title, message + " This department has no faculty advisor.",
                    "/admin/verifications/" + version.getId());
        }
    }

    private void notifyStudent(StudentProfile profile, User reviewer, String title, String message) {
        if (profile.getUser() == null) {
            return;
        }
        publish(List.of(profile.getUser().getId()), reviewer.getId(), title, message, "/student/verification");
    }

    private void publish(List<Long> recipients, Long sender, String title, String message, String link) {
        if (recipients.isEmpty()) {
            return;
        }
        eventPublisher.publishEvent(new UserNotificationEvent(recipients, sender, title, message,
                NotificationType.VERIFICATION, NotificationPriority.NORMAL, null, link, true));
    }

    private StudentProfile findStudent(String email) {
        return userRepository.findByEmailAndIsDeletedFalse(email)
                .flatMap(u -> studentProfileRepository.findByUserId(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }

    private static List<String> names(Collection<ProfileSection> sections) {
        return sections.stream().sorted().map(Enum::name).toList();
    }

    private static String readable(Collection<ProfileSection> sections) {
        return String.join(", ", sections.stream().sorted().map(s -> s.name().toLowerCase(Locale.ROOT)).toList());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Presents an upload under a server-chosen original name, so the stored name records its owner. */
    private record OwnedFile(MultipartFile delegate, String name) implements MultipartFile {
        @Override public String getName() { return delegate.getName(); }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return delegate.getContentType(); }
        @Override public boolean isEmpty() { return delegate.isEmpty(); }
        @Override public long getSize() { return delegate.getSize(); }
        @Override public byte[] getBytes() throws IOException { return delegate.getBytes(); }
        @Override public InputStream getInputStream() throws IOException { return delegate.getInputStream(); }
        @Override public void transferTo(java.io.File dest) throws IOException { delegate.transferTo(dest); }
    }
}
