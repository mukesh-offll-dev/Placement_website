package com.gces.placementcell.service;

import com.gces.placementcell.dto.request.StudentEducationRequest;
import com.gces.placementcell.dto.response.StudentEducationResponse;
import com.gces.placementcell.entity.StudentEducation;
import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.repository.StudentEducationRepository;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import com.gces.placementcell.service.impl.StudentEducationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StudentEducationServiceImpl Unit Tests")
class StudentEducationServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private StudentEducationRepository studentEducationRepository;

    @InjectMocks
    private StudentEducationServiceImpl studentEducationService;

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
                .fullName("Test Student")
                .email("student@gces.edu")
                .build();
    }

    @Test
    @DisplayName("createEducation saves education linked to parent student profile ID")
    void testCreateEducationSuccess() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentEducationRepository.save(any(StudentEducation.class))).thenAnswer(invocation -> {
            StudentEducation edu = invocation.getArgument(0);
            edu.setId(100L);
            return edu;
        });

        StudentEducationRequest request = new StudentEducationRequest(
                "GCE Srirangam",
                "B.E CSE",
                "Anna University",
                (short) 2022,
                (short) 2026,
                "8.5 CGPA",
                false
        );

        StudentEducationResponse response = studentEducationService.createEducation("student@gces.edu", request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals("GCE Srirangam", response.institutionName());
        assertEquals("B.E CSE", response.degree());

        verify(studentEducationRepository).save(argThat(edu ->
                edu.getStudentProfile() != null && edu.getStudentProfile().getId().equals(10L)
        ));
    }

    @Test
    @DisplayName("getAllEducation returns all education records for the student")
    void testGetAllEducationSuccess() {
        StudentEducation edu = StudentEducation.builder()
                .id(100L)
                .studentProfile(studentProfile)
                .institutionName("GCE Srirangam")
                .degree("B.E CSE")
                .startYear((short) 2022)
                .endYear((short) 2026)
                .build();

        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentEducationRepository.findByStudentProfileIdOrderByStartYearDesc(10L)).thenReturn(List.of(edu));

        List<StudentEducationResponse> list = studentEducationService.getAllEducation("student@gces.edu");

        assertEquals(1, list.size());
        assertEquals("GCE Srirangam", list.get(0).institutionName());
    }

    @Test
    @DisplayName("getEducationById throws ResourceNotFoundException when education does not belong to student")
    void testGetEducationByIdNotFound() {
        when(userRepository.findByEmailAndIsDeletedFalse("student@gces.edu")).thenReturn(Optional.of(studentUser));
        when(studentProfileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(studentEducationRepository.findByIdAndStudentProfileId(999L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                studentEducationService.getEducationById("student@gces.edu", 999L)
        );
    }
}

