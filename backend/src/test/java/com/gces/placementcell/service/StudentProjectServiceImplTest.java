package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentProjectRequest;
import com.gces.placementcell.dto.response.StudentProjectResponse;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.StudentProject;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.StudentProjectRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.impl.StudentProjectServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentProjectServiceImpl Unit Tests & Ownership Enforcement")
class StudentProjectServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private StudentProjectRepository studentProjectRepository;

    @InjectMocks
    private StudentProjectServiceImpl studentProjectService;

    private User studentAUser;
    private StudentProfile studentAProfile;

    private User studentBUser;
    private StudentProfile studentBProfile;

    private StudentProject projectA;

    @BeforeEach
    void setUp() {
        studentAUser = User.builder().id(1L).email("studentA@gces.edu").role(UserRole.STUDENT).isActive(true).isDeleted(false).build();
        studentAProfile = StudentProfile.builder().id(101L).user(studentAUser).fullName("Student A").email("studentA@gces.edu").build();

        studentBUser = User.builder().id(2L).email("studentB@gces.edu").role(UserRole.STUDENT).isActive(true).isDeleted(false).build();
        studentBProfile = StudentProfile.builder().id(202L).user(studentBUser).fullName("Student B").email("studentB@gces.edu").build();

        projectA = StudentProject.builder()
                .id(501L)
                .studentProfile(studentAProfile)
                .title("AI Placement Portal")
                .description("Smart placement management platform")
                .liveUrl("https://ai-placement.example.com")
                .repoUrl("https://github.com/studentA/ai-placement")
                .techStack(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("createProject succeeds and attaches technologies")
    void testCreateProjectSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.existsByStudentProfileIdAndTitle(101L, "Placement System")).thenReturn(false);
        when(studentProjectRepository.save(any(StudentProject.class))).thenAnswer(i -> {
            StudentProject p = i.getArgument(0);
            p.setId(502L);
            return p;
        });

        StudentProjectRequest request = new StudentProjectRequest(
                "Placement System",
                "Placement portal in Spring Boot",
                "https://live.example.com",
                "https://github.com/repo",
                null,
                List.of("Java", "Spring Boot", "React")
        );

        StudentProjectResponse response = studentProjectService.createProject("studentA@gces.edu", request);

        assertNotNull(response);
        assertEquals("Placement System", response.title());
        assertEquals(3, response.techStack().size());
        assertTrue(response.techStack().contains("Java"));
        assertTrue(response.techStack().contains("Spring Boot"));
        assertTrue(response.techStack().contains("React"));
    }

    @Test
    @DisplayName("createProject throws DuplicateResourceException on duplicate title for same student")
    void testCreateProjectDuplicateTitleThrows() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.existsByStudentProfileIdAndTitle(101L, "AI Placement Portal")).thenReturn(true);

        StudentProjectRequest request = new StudentProjectRequest(
                "AI Placement Portal", "desc", null, null, null, null
        );

        assertThrows(DuplicateResourceException.class, () -> studentProjectService.createProject("studentA@gces.edu", request));
    }

    @Test
    @DisplayName("getAllProjects returns only projects belonging to authenticated student")
    void testGetAllProjectsReturnsOnlyOwnedProjects() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.findByStudentProfileIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(projectA));

        List<StudentProjectResponse> projects = studentProjectService.getAllProjects("studentA@gces.edu");

        assertEquals(1, projects.size());
        assertEquals("AI Placement Portal", projects.get(0).title());
    }

    @Test
    @DisplayName("getProjectById successfully returns project when owned by authenticated student")
    void testGetProjectByIdSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 101L)).thenReturn(Optional.of(projectA));

        StudentProjectResponse response = studentProjectService.getProjectById("studentA@gces.edu", 501L);

        assertNotNull(response);
        assertEquals(501L, response.id());
        assertEquals("AI Placement Portal", response.title());
    }

    @Test
    @DisplayName("SECURITY OWNERSHIP: Student B cannot view Student A's project (throws 404)")
    void testStudentBCannotViewStudentAProject() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentB@gces.edu")).thenReturn(Optional.of(studentBUser));
        when(studentProfileRepository.findByUserId(2L)).thenReturn(Optional.of(studentBProfile));
        // Student B's profile ID is 202L, while projectA belongs to 101L
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 202L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                studentProjectService.getProjectById("studentB@gces.edu", 501L));
    }

    @Test
    @DisplayName("SECURITY OWNERSHIP: Student B cannot update Student A's project (throws 404)")
    void testStudentBCannotUpdateStudentAProject() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentB@gces.edu")).thenReturn(Optional.of(studentBUser));
        when(studentProfileRepository.findByUserId(2L)).thenReturn(Optional.of(studentBProfile));
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 202L)).thenReturn(Optional.empty());

        StudentProjectRequest updateRequest = new StudentProjectRequest(
                "Hacked Title", "Hacked desc", null, null, null, null
        );

        assertThrows(ResourceNotFoundException.class, () ->
                studentProjectService.updateProject("studentB@gces.edu", 501L, updateRequest));
    }

    @Test
    @DisplayName("SECURITY OWNERSHIP: Student B cannot delete Student A's project (throws 404)")
    void testStudentBCannotDeleteStudentAProject() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentB@gces.edu")).thenReturn(Optional.of(studentBUser));
        when(studentProfileRepository.findByUserId(2L)).thenReturn(Optional.of(studentBProfile));
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 202L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                studentProjectService.deleteProject("studentB@gces.edu", 501L));

        verify(studentProjectRepository, never()).delete(any());
    }

    @Test
    @DisplayName("updateProject successfully updates student's own project")
    void testUpdateProjectSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 101L)).thenReturn(Optional.of(projectA));
        when(studentProjectRepository.save(any(StudentProject.class))).thenReturn(projectA);

        StudentProjectRequest updateRequest = new StudentProjectRequest(
                "Updated Project Title",
                "New description",
                "https://newlive.com",
                "https://newrepo.com",
                null,
                List.of("Go", "Docker")
        );

        StudentProjectResponse response = studentProjectService.updateProject("studentA@gces.edu", 501L, updateRequest);

        assertNotNull(response);
        assertEquals("Updated Project Title", response.title());
        assertEquals("New description", projectA.getDescription());
        assertEquals("https://newlive.com", projectA.getLiveUrl());
    }

    @Test
    @DisplayName("deleteProject successfully deletes student's own project")
    void testDeleteProjectSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("studentA@gces.edu")).thenReturn(Optional.of(studentAUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentAProfile));
        when(studentProjectRepository.findByIdAndStudentProfileId(501L, 101L)).thenReturn(Optional.of(projectA));

        studentProjectService.deleteProject("studentA@gces.edu", 501L);

        verify(studentProjectRepository).delete(projectA);
    }
}
