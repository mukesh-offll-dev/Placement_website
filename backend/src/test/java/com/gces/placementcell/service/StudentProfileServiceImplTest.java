package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.request.StudentExperienceRequest;
import com.gces.placementcell.dto.request.StudentProfileRequest;
import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.request.StudentSkillRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.dto.response.StudentExperienceResponse;
import com.gces.placementcell.dto.response.StudentProfileResponse;
import com.gces.placementcell.dto.response.StudentSkillResponse;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentExperience;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.StudentSkill;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.ExperienceType;
import com.gces.placementcell.entity.enums.PlacementStatus;
import com.gces.placementcell.entity.enums.SkillProficiency;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.BadRequestException;
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
import java.time.LocalDate;
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

    @Test
    @DisplayName("createProfile saves skills when provided and returns full profile")
    void testCreateProfileWithSkills() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.existsByUserId(1L)).thenReturn(false);
        when(studentProfileRepository.existsByRollNo("811521104001")).thenReturn(false);
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(i -> {
            StudentProfile p = i.getArgument(0);
            p.setId(10L);
            return p;
        });

        StudentSkill skill1 = StudentSkill.builder().id(101L).skillName("Java").proficiency(SkillProficiency.INTERMEDIATE).studentProfile(studentProfile).build();
        StudentSkill skill2 = StudentSkill.builder().id(102L).skillName("React").proficiency(SkillProficiency.INTERMEDIATE).studentProfile(studentProfile).build();
        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of(skill1, skill2));
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar", "811521104001", "student@gces.edu", "9876543210", "Trichy",
                "Bio", null, null, "GCES", "B.E.", "CSE", "CSE", "2021-2025",
                (short) 7, new BigDecimal("8.50"), 0, 0, true, List.of("Java", "React", "java")
        );

        StudentProfileResponse response = studentProfileService.createProfile("student@gces.edu", request);

        assertNotNull(response);
        assertEquals(2, response.skills().size());
        verify(studentSkillRepository, times(2)).save(any(StudentSkill.class));
    }

    @Test
    @DisplayName("updateProfile updates skills when provided")
    void testUpdateProfileWithSkills() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenReturn(studentProfile);

        StudentSkill skill1 = StudentSkill.builder().id(201L).skillName("Docker").proficiency(SkillProficiency.INTERMEDIATE).studentProfile(studentProfile).build();
        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of(skill1));
        when(studentEducationRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentExperienceRepository.findByStudentProfileId(10L)).thenReturn(List.of());
        when(studentProjectRepository.findByStudentIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

        StudentProfileRequest request = new StudentProfileRequest(
                "Adithya Kumar", "811521104001", "student@gces.edu", "9876543210", "Trichy",
                "Bio", null, null, "GCES", "B.E.", "CSE", "CSE", "2021-2025",
                (short) 7, new BigDecimal("8.50"), 0, 0, true, List.of("Docker")
        );

        StudentProfileResponse response = studentProfileService.updateProfile("student@gces.edu", request);

        assertNotNull(response);
        assertEquals(1, response.skills().size());
        assertEquals("Docker", response.skills().get(0).skillName());
        verify(studentSkillRepository).deleteByStudentProfileId(10L);
        verify(studentSkillRepository).save(any(StudentSkill.class));
    }

    @Test
    @DisplayName("getSkills returns all skills for student")
    void testGetSkills() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentSkill skill = StudentSkill.builder().id(1L).skillName("Spring Boot").proficiency(SkillProficiency.ADVANCED).studentProfile(studentProfile).build();
        when(studentSkillRepository.findByStudentProfileIdOrderBySkillNameAsc(10L)).thenReturn(List.of(skill));

        List<StudentSkillResponse> skills = studentProfileService.getSkills("student@gces.edu");

        assertEquals(1, skills.size());
        assertEquals("Spring Boot", skills.get(0).skillName());
        assertEquals(SkillProficiency.ADVANCED, skills.get(0).proficiency());
    }

    @Test
    @DisplayName("addSkill successfully saves new skill")
    void testAddSkillSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentSkillRepository.existsByStudentProfileIdAndSkillNameIgnoreCase(10L, "PostgreSQL")).thenReturn(false);
        when(studentSkillRepository.save(any(StudentSkill.class))).thenAnswer(i -> {
            StudentSkill s = i.getArgument(0);
            s.setId(50L);
            return s;
        });
        when(studentProfileRepository.save(any(StudentProfile.class))).thenReturn(studentProfile);

        StudentSkillRequest request = new StudentSkillRequest("PostgreSQL", SkillProficiency.INTERMEDIATE);
        StudentSkillResponse response = studentProfileService.addSkill("student@gces.edu", request);

        assertNotNull(response);
        assertEquals("PostgreSQL", response.skillName());
        assertEquals(SkillProficiency.INTERMEDIATE, response.proficiency());
        verify(studentSkillRepository).save(any(StudentSkill.class));
    }

    @Test
    @DisplayName("addSkill rejects duplicate skill name")
    void testAddSkillDuplicateThrows() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentSkillRepository.existsByStudentProfileIdAndSkillNameIgnoreCase(10L, "java")).thenReturn(true);

        StudentSkillRequest request = new StudentSkillRequest("java");

        assertThrows(DuplicateResourceException.class, () -> studentProfileService.addSkill("student@gces.edu", request));
    }

    @Test
    @DisplayName("addSkill rejects blank or overly long skill name")
    void testAddSkillValidation() {
        assertThrows(BadRequestException.class, () -> studentProfileService.addSkill("student@gces.edu", new StudentSkillRequest("   ")));
        assertThrows(BadRequestException.class, () -> studentProfileService.addSkill("student@gces.edu", new StudentSkillRequest("a".repeat(61))));
    }

    @Test
    @DisplayName("updateSkill successfully modifies existing skill")
    void testUpdateSkillSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentSkill existing = StudentSkill.builder().id(30L).skillName("Vue.js").proficiency(SkillProficiency.BEGINNER).studentProfile(studentProfile).build();
        when(studentSkillRepository.findById(30L)).thenReturn(Optional.of(existing));
        when(studentSkillRepository.existsByStudentProfileIdAndSkillNameIgnoreCase(10L, "React.js")).thenReturn(false);
        when(studentSkillRepository.save(any(StudentSkill.class))).thenAnswer(i -> i.getArgument(0));

        StudentSkillRequest request = new StudentSkillRequest("React.js", SkillProficiency.ADVANCED);
        StudentSkillResponse response = studentProfileService.updateSkill("student@gces.edu", 30L, request);

        assertNotNull(response);
        assertEquals("React.js", response.skillName());
        assertEquals(SkillProficiency.ADVANCED, response.proficiency());
    }

    @Test
    @DisplayName("deleteSkill removes skill belonging to student")
    void testDeleteSkillSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentSkill existing = StudentSkill.builder().id(40L).skillName("Python").studentProfile(studentProfile).build();
        when(studentSkillRepository.findById(40L)).thenReturn(Optional.of(existing));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenReturn(studentProfile);

        studentProfileService.deleteSkill("student@gces.edu", 40L);

        verify(studentSkillRepository).delete(existing);
    }

    @Test
    @DisplayName("addEducation successfully creates education record")
    void testAddEducationSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentEducationRepository.save(any(StudentEducation.class))).thenAnswer(i -> {
            StudentEducation e = i.getArgument(0);
            e.setId(100L);
            return e;
        });

        StudentEducationRequest request = new StudentEducationRequest(
                "Government College of Engineering",
                "B.E. CSE",
                "Anna University",
                (short) 2021,
                (short) 2025,
                "8.5 CGPA",
                false
        );

        StudentEducationResponse response = studentProfileService.addEducation("student@gces.edu", request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals("Government College of Engineering", response.institutionName());
        assertEquals("B.E. CSE", response.degree());
        assertEquals((short) 2021, response.startYear());
        assertEquals((short) 2025, response.endYear());
        assertFalse(response.isCurrent());
    }

    @Test
    @DisplayName("updateEducation successfully updates existing record")
    void testUpdateEducationSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentEducation existing = StudentEducation.builder()
                .id(101L)
                .studentProfile(studentProfile)
                .institutionName("Old College")
                .degree("B.Sc")
                .startYear((short) 2019)
                .endYear((short) 2022)
                .build();
        when(studentEducationRepository.findById(101L)).thenReturn(Optional.of(existing));
        when(studentEducationRepository.save(any(StudentEducation.class))).thenAnswer(i -> i.getArgument(0));

        StudentEducationRequest request = new StudentEducationRequest(
                "Updated College",
                "B.E. Computer Science",
                "State Board",
                (short) 2020,
                null,
                "9.0 CGPA",
                true
        );

        StudentEducationResponse response = studentProfileService.updateEducation("student@gces.edu", 101L, request);

        assertNotNull(response);
        assertEquals("Updated College", response.institutionName());
        assertEquals("B.E. Computer Science", response.degree());
        assertTrue(response.isCurrent());
        assertNull(response.endYear());
    }

    @Test
    @DisplayName("deleteEducation deletes education record belonging to student")
    void testDeleteEducationSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentEducation existing = StudentEducation.builder()
                .id(102L)
                .studentProfile(studentProfile)
                .build();
        when(studentEducationRepository.findById(102L)).thenReturn(Optional.of(existing));

        studentProfileService.deleteEducation("student@gces.edu", 102L);

        verify(studentEducationRepository).delete(existing);
    }

    @Test
    @DisplayName("addExperience successfully creates internship record")
    void testAddExperienceSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentExperienceRepository.save(any(StudentExperience.class))).thenAnswer(i -> {
            StudentExperience exp = i.getArgument(0);
            exp.setId(200L);
            return exp;
        });

        StudentExperienceRequest request = new StudentExperienceRequest(
                "Software Engineer Intern",
                "Tech Solutions Inc.",
                ExperienceType.INTERNSHIP,
                "Bangalore",
                LocalDate.of(2024, 6, 1),
                LocalDate.of(2024, 8, 31),
                "Developed full-stack web features",
                false
        );

        StudentExperienceResponse response = studentProfileService.addExperience("student@gces.edu", request);

        assertNotNull(response);
        assertEquals(200L, response.id());
        assertEquals("Software Engineer Intern", response.jobRole());
        assertEquals("Tech Solutions Inc.", response.company());
        assertEquals(ExperienceType.INTERNSHIP, response.experienceType());
        assertFalse(response.isCurrent());
    }

    @Test
    @DisplayName("updateExperience successfully updates existing record")
    void testUpdateExperienceSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentExperience existing = StudentExperience.builder()
                .id(201L)
                .studentProfile(studentProfile)
                .jobRole("Junior Dev")
                .company("Old Corp")
                .experienceType(ExperienceType.INTERNSHIP)
                .startDate(LocalDate.of(2023, 1, 1))
                .build();
        when(studentExperienceRepository.findById(201L)).thenReturn(Optional.of(existing));
        when(studentExperienceRepository.save(any(StudentExperience.class))).thenAnswer(i -> i.getArgument(0));

        StudentExperienceRequest request = new StudentExperienceRequest(
                "Lead Intern",
                "New Corp",
                ExperienceType.INTERNSHIP,
                "Remote",
                LocalDate.of(2023, 2, 1),
                null,
                "Leading frontend team",
                true
        );

        StudentExperienceResponse response = studentProfileService.updateExperience("student@gces.edu", 201L, request);

        assertNotNull(response);
        assertEquals("Lead Intern", response.jobRole());
        assertEquals("New Corp", response.company());
        assertTrue(response.isCurrent());
        assertNull(response.endDate());
    }

    @Test
    @DisplayName("deleteExperience deletes experience record belonging to student")
    void testDeleteExperienceSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));

        StudentExperience existing = StudentExperience.builder()
                .id(202L)
                .studentProfile(studentProfile)
                .build();
        when(studentExperienceRepository.findById(202L)).thenReturn(Optional.of(existing));

        studentProfileService.deleteExperience("student@gces.edu", 202L);

        verify(studentExperienceRepository).delete(existing);
    }
}
