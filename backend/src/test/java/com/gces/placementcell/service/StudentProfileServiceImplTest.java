package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.*;
import com.gces.placementcell.service.impl.StudentProfileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentProfileServiceImpl Unit Tests")
class StudentProfileServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private StudentSkillRepository studentSkillRepository;

    @Mock
    private StudentEducationRepository studentEducationRepository;

    @Mock
    private StudentExperienceRepository studentExperienceRepository;

    @Mock
    private StudentProjectRepository studentProjectRepository;

    @InjectMocks
    private StudentProfileServiceImpl studentProfileService;

    private User studentUser;
    private StudentProfile studentProfile;

    @BeforeEach
    void setUp() {
        studentUser = User.builder()
                .id(1L)
                .email("student@gces.edu")
                .role(UserRole.STUDENT)
                .isActive(true)
                .isDeleted(false)
                .build();

        studentProfile = StudentProfile.builder()
                .id(10L)
                .user(studentUser)
                .fullName("Adithya Kumar")
                .email("student@gces.edu")
                .rollNo("811521104001")
                .department("Computer Science and Engineering")
                .departmentCode("CSE")
                .cgpa(new BigDecimal("8.50"))
                .semester(7)
                .placementStatus(PlacementStatus.PENDING)
                .isOpenToOpportunities(true)
                .build();
    }

    @Test
    @DisplayName("getProfile successfully returns profile with child collections")
    void testGetProfileSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of());
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentProfileResponse response = studentProfileService.getProfile("student@gces.edu");

        assertNotNull(response);
        assertEquals("Adithya Kumar", response.fullName());
        assertEquals("811521104001", response.rollNo());
        assertEquals("student@gces.edu", response.email());
    }

    @Test
    @DisplayName("getProfile throws ResourceNotFoundException if profile not found")
    void testGetProfileNotFound() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> studentProfileService.getProfile("student@gces.edu"));
    }

    @Test
    @DisplayName("createProfile successfully creates profile when none exists")
    void testCreateProfileSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.existsByUserId(1L)).thenReturn(false);
        when(studentProfileRepository.existsByRollNo("811521104001")).thenReturn(false);
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> {
            StudentProfile p = i.getArgument(0);
            p.setId(10L);
            return p;
        });

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "Passionate developer",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "Computer Science",
                "CSE",
                "2021-2025",
                (short) 7,
                new BigDecimal("8.50"),
                0,
                0,
                true
        );

        StudentProfileResponse response = studentProfileService.createProfile("student@gces.edu", request);

        assertNotNull(response);
        assertEquals("Adithya Kumar", response.fullName());
        assertEquals("811521104001", response.rollNo());
        verify(studentProfileRepository).save(any(StudentProfile.class));
    }

    @Test
    @DisplayName("createProfile with education and projects links parent student profile ID correctly")
    void testCreateProfileWithEducationAndProjectsSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.existsByUserId(1L)).thenReturn(false);
        when(studentProfileRepository.existsByRollNo("811521104001")).thenReturn(false);
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> {
            StudentProfile p = i.getArgument(0);
            p.setId(10L);
            return p;
        });
        when(studentProjectRepository.existsByStudentIdAndTitle(eq(10L), eq("AI Chatbot"))).thenReturn(false);
        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of());
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentEducationRequest eduReq = new StudentEducationRequest(
                "GCE Srirangam", "B.E. CSE", "Anna University", (short) 2022, (short) 2026, "8.9 CGPA", true
        );
        StudentProjectRequest projReq = new StudentProjectRequest(
                "AI Chatbot", "Intelligent chatbot portal", "https://chat.example.com", "https://github.com/test/chat", null, List.of("Java", "React")
        );

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "Passionate developer",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "Computer Science",
                "CSE",
                "2021-2025",
                (short) 7,
                new BigDecimal("8.50"),
                0,
                0,
                true,
                List.of(eduReq),
                List.of(projReq)
        );

        StudentProfileResponse response = studentProfileService.createProfile("student@gces.edu", request);

        assertNotNull(response);
        verify(studentEducationRepository).save(argThat(edu ->
                edu.getStudentProfile() != null && edu.getStudentProfile().getId().equals(10L)
                        && edu.getInstitutionName().equals("GCE Srirangam")
        ));
        verify(studentProjectRepository).save(argThat(proj ->
                proj.getStudentProfile() != null && proj.getStudentProfile().getId().equals(10L)
                        && proj.getTitle().equals("AI Chatbot")
        ));
    }

    @Test
    @DisplayName("createProfile throws DuplicateResourceException if profile already exists")
    void testCreateProfileAlreadyExists() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.existsByUserId(1L)).thenReturn(true);

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar", "811521104001", "student@gces.edu", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        assertThrows(DuplicateResourceException.class, () -> studentProfileService.createProfile("student@gces.edu", request));
    }

    @Test
    @DisplayName("updateProfile updates profile fields successfully")
    void testUpdateProfileSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> i.getArgument(0));

        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of());
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya K Updated",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Chennai",
                "Updated bio",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "CSE",
                "CSE",
                "2021-2025",
                (short) 8,
                new BigDecimal("8.75"),
                0,
                0,
                true
        );

        StudentProfileResponse response = studentProfileService.updateProfile("student@gces.edu", request);

        assertNotNull(response);
        assertEquals("Adithya K Updated", response.fullName());
        assertEquals("Chennai", studentProfile.getAddress());
        assertEquals("Updated bio", studentProfile.getAbout());
    }

    @Test
    @DisplayName("updateProfile with education removes old records to avoid duplicates and saves with correct parent ID")
    void testUpdateProfileWithEducationAvoidsDuplicates() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> i.getArgument(0));

        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of());
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentEducationRequest eduReq = new StudentEducationRequest(
                "Anna University Campus", "M.Tech CSE", "Anna University", (short) 2026, (short) 2028, "9.0 CGPA", false
        );

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar",
                "811521104001",
                "student@gces.edu",
                "9876543210",
                "Trichy",
                "Bio",
                null,
                null,
                "GCE Srirangam",
                "B.E.",
                "CSE",
                "CSE",
                "2021-2025",
                (short) 7,
                new BigDecimal("8.50"),
                0,
                0,
                true,
                List.of(eduReq),
                null
        );

        studentProfileService.updateProfile("student@gces.edu", request);

        verify(studentEducationRepository).deleteByStudentProfileId(10L);
        verify(studentEducationRepository).save(argThat(edu ->
                edu.getStudentProfile() != null && edu.getStudentProfile().getId().equals(10L)
                        && edu.getInstitutionName().equals("Anna University Campus")
        ));
    }
}
