package com.gces.placementcell.service;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.FacultyProfileRepository;
import com.gces.placementcell.repository.JobApplicationRepository;
import com.gces.placementcell.repository.StudentAchievementRepository;
import com.gces.placementcell.repository.StudentCertificationRepository;
import com.gces.placementcell.repository.StudentDocumentRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who may read a stored file served by /files/{download|view}/{category}/{fileName}.
 *
 * resumes / projects (official files): admins and placement officers read any; a faculty advisor
 * reads those of students in their department; a student only files referenced by their own records.
 *
 * verification (uploads for profile verification): the owning student, the faculty advisor of the
 * student's department and admins; placement officers only once the file is part of the OFFICIAL
 * (approved) profile. Anyone else gets 403.
 */
@Service
public class FileAccessPolicy {

    private final FileStorageProperties properties;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentDocumentRepository documentRepository;
    private final JobApplicationRepository applicationRepository;
    private final StudentProjectRepository projectRepository;
    private final StudentCertificationRepository certificationRepository;
    private final StudentAchievementRepository achievementRepository;
    private final FacultyProfileRepository facultyProfileRepository;

    public FileAccessPolicy(FileStorageProperties properties,
                            UserRepository userRepository,
                            StudentProfileRepository studentProfileRepository,
                            StudentDocumentRepository documentRepository,
                            JobApplicationRepository applicationRepository,
                            StudentProjectRepository projectRepository,
                            StudentCertificationRepository certificationRepository,
                            StudentAchievementRepository achievementRepository,
                            FacultyProfileRepository facultyProfileRepository) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.documentRepository = documentRepository;
        this.applicationRepository = applicationRepository;
        this.projectRepository = projectRepository;
        this.certificationRepository = certificationRepository;
        this.achievementRepository = achievementRepository;
        this.facultyProfileRepository = facultyProfileRepository;
    }

    @Transactional(readOnly = true)
    public void verifyCanRead(UserDetails caller, String category, String fileName) {
        // Company logos are public (the job list that shows them is public too): no sign-in needed.
        if (properties.getLogoSubdir().equals(category) && fileName != null && !fileName.isBlank()) {
            return;
        }
        if (caller == null) {
            throw new InsufficientAuthenticationException("Authentication is required to access this resource");
        }
        boolean resumes = properties.getResumeSubdir().equals(category);
        boolean projects = properties.getProjectMediaSubdir().equals(category);
        boolean verification = VerificationFiles.CATEGORY.equals(category);
        if (!resumes && !projects && !verification) {
            throw new ResourceNotFoundException("File not found: " + fileName);
        }
        if (fileName == null || fileName.isBlank()) {
            throw new AccessDeniedException("You are not authorized to access this file");
        }
        if (verification) {
            verifyVerificationFile(caller, fileName);
            return;
        }
        if (isAdminOrOfficer(caller)) {
            return;
        }
        String suffix = "/" + fileName;
        if (hasRole(caller, "ROLE_FACULTY_ADVISOR")) {
            String code = facultyDepartmentCode(caller);
            boolean inDepartment = code != null && (resumes
                    ? studentProfileRepository.existsByDepartmentCodeIgnoreCaseAndResumeUrlEndingWith(code, suffix)
                        || documentRepository.existsInDepartmentWithFile(code, fileName)
                    : projectRepository.existsByStudentProfileDepartmentCodeIgnoreCaseAndMediaUrlEndingWith(code, suffix));
            if (!inDepartment) {
                throw new AccessDeniedException("You are not authorized to access this file");
            }
            return;
        }
        StudentProfile profile = ownProfile(caller);
        if (profile == null) {
            throw new AccessDeniedException("You are not authorized to access this file");
        }
        boolean owns = resumes
                ? (profile.getResumeUrl() != null && profile.getResumeUrl().endsWith(suffix))
                    || documentRepository.existsByStudentIdAndFileUrl(profile.getId(), fileName)
                    || applicationRepository.existsByStudentProfileIdAndResumeUrlEndingWith(profile.getId(), suffix)
                : projectRepository.existsByStudentProfileIdAndMediaUrlEndingWith(profile.getId(), suffix);
        if (!owns) {
            throw new AccessDeniedException("You are not authorized to access this file");
        }
    }

    private void verifyVerificationFile(UserDetails caller, String fileName) {
        if (hasRole(caller, "ROLE_ADMIN")) {
            return;
        }
        Long ownerId = VerificationFiles.ownerOf(fileName);
        StudentProfile owner = ownerId == null ? null : studentProfileRepository.findById(ownerId).orElse(null);
        if (owner == null) {
            throw new AccessDeniedException("You are not authorized to access this file");
        }
        if (hasRole(caller, "ROLE_STUDENT")) {
            StudentProfile self = ownProfile(caller);
            if (self != null && self.getId().equals(owner.getId())) {
                return;
            }
        } else if (hasRole(caller, "ROLE_FACULTY_ADVISOR")) {
            String code = facultyDepartmentCode(caller);
            if (code != null && owner.getDepartmentCode() != null && code.equalsIgnoreCase(owner.getDepartmentCode().trim())) {
                return;
            }
        } else if (hasRole(caller, "ROLE_PLACEMENT_OFFICER") && isOfficial(owner, fileName)) {
            return;
        }
        throw new AccessDeniedException("You are not authorized to access this file");
    }

    /** Whether the file is referenced by the student's approved (official) profile. */
    private boolean isOfficial(StudentProfile owner, String fileName) {
        String suffix = "/" + fileName;
        Long id = owner.getId();
        return (owner.getResumeUrl() != null && owner.getResumeUrl().endsWith(suffix))
                || (owner.getAvatarUrl() != null && owner.getAvatarUrl().endsWith(suffix))
                || documentRepository.existsByStudentIdAndFileUrlEndingWith(id, suffix)
                || certificationRepository.existsByStudentProfileIdAndFileUrlEndingWith(id, suffix)
                || achievementRepository.existsByStudentProfileIdAndFileUrlEndingWith(id, suffix)
                || projectRepository.existsByStudentProfileIdAndMediaUrlEndingWith(id, suffix);
    }

    private StudentProfile ownProfile(UserDetails caller) {
        if (!hasRole(caller, "ROLE_STUDENT")) {
            return null;
        }
        return userRepository.findByEmailAndIsDeletedFalse(caller.getUsername())
                .flatMap(user -> studentProfileRepository.findByUserId(user.getId()))
                .orElse(null);
    }

    private String facultyDepartmentCode(UserDetails caller) {
        return userRepository.findByEmailAndIsDeletedFalse(caller.getUsername())
                .flatMap(user -> facultyProfileRepository.findByUserId(user.getId()))
                .map(FacultyProfile::getDepartment)
                .map(d -> d.getCode())
                .orElse(null);
    }

    private static boolean hasRole(UserDetails caller, String authority) {
        return caller.getAuthorities().stream().anyMatch(a -> authority.equals(a.getAuthority()));
    }

    public static boolean isAdminOrOfficer(UserDetails caller) {
        return caller.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_PLACEMENT_OFFICER".equals(a.getAuthority()));
    }
}
