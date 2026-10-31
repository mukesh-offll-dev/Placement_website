package com.gces.placementcell.service.impl;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentEducationRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.StudentEducationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentEducationServiceImpl implements StudentEducationService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final StudentEducationRepository studentEducationRepository;

    @Override
    @Transactional
    public StudentEducationResponse createEducation(String email, StudentEducationRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);

        StudentEducation education = StudentEducation.builder()
                .studentProfile(profile)
                .institutionName(request.institutionName().trim())
                .degree(request.degree().trim())
                .boardOrUniversity(request.boardOrUniversity() != null ? request.boardOrUniversity().trim() : null)
                .startYear(request.startYear())
                .endYear(request.endYear())
                .grade(request.grade() != null ? request.grade().trim() : null)
                .isCurrent(Boolean.TRUE.equals(request.isCurrent()))
                .build();

        education = studentEducationRepository.save(education);
        log.info("Created education record (id: {}) for student {}", education.getId(), email);

        return StudentEducationResponse.from(education);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentEducationResponse> getAllEducation(String email) {
        StudentProfile profile = getStudentProfileByEmail(email);
        return studentEducationRepository.findByStudentProfileIdOrderByStartYearDesc(profile.getId())
                .stream().map(StudentEducationResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentEducationResponse getEducationById(String email, Long educationId) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentEducation education = studentEducationRepository.findByIdAndStudentProfileId(educationId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Education record not found with id: " + educationId));

        return StudentEducationResponse.from(education);
    }

    @Override
    @Transactional
    public StudentEducationResponse updateEducation(String email, Long educationId, StudentEducationRequest request) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentEducation education = studentEducationRepository.findByIdAndStudentProfileId(educationId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Education record not found with id: " + educationId));

        education.setInstitutionName(request.institutionName().trim());
        education.setDegree(request.degree().trim());
        education.setBoardOrUniversity(request.boardOrUniversity() != null ? request.boardOrUniversity().trim() : null);
        education.setStartYear(request.startYear());
        education.setEndYear(request.endYear());
        education.setGrade(request.grade() != null ? request.grade().trim() : null);
        education.setIsCurrent(Boolean.TRUE.equals(request.isCurrent()));

        education = studentEducationRepository.save(education);
        log.info("Updated education record id: {} for student {}", educationId, email);

        return StudentEducationResponse.from(education);
    }

    @Override
    @Transactional
    public void deleteEducation(String email, Long educationId) {
        StudentProfile profile = getStudentProfileByEmail(email);
        StudentEducation education = studentEducationRepository.findByIdAndStudentProfileId(educationId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Education record not found with id: " + educationId));

        studentEducationRepository.delete(education);
        log.info("Deleted education record id: {} for student {}", educationId, email);
    }

    private StudentProfile getStudentProfileByEmail(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found. Please create your profile first."));
    }
}

