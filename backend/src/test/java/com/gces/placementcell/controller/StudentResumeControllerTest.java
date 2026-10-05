package com.gces.placementcell.controller;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.response.ResumeResponse;
import com.gces.placementcell.entity.enums.DocumentStatus;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.StudentResumeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StudentResumeController.class)
@AutoConfigureMockMvc(addFilters = false)
class StudentResumeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StudentResumeService resumeService;

    @MockBean
    private FileStorageService fileStorageService;

    // AdminAuthFilter is a servlet-filter bean, so the MVC slice constructs it even with
    // addFilters = false; its dependencies are not part of the slice and must be mocked.
    @MockBean
    private com.gces.placementcell.security.TokenProvider tokenProvider;

    @MockBean
    private com.gces.placementcell.repository.UserRepository userRepository;

    @Test
    void testUploadResume_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "PDF Content".getBytes()
        );

        ResumeResponse mockResponse = ResumeResponse.builder()
                .documentId(1L)
                .studentId(10L)
                .fileName("resume.pdf")
                .resumeUrl("/api/files/download/resumes/resume.pdf")
                .downloadUrl("/api/students/10/resume/download")
                .fileSize(1024L)
                .status(DocumentStatus.PENDING)
                .uploadedAt(LocalDateTime.now())
                .build();

        when(resumeService.uploadResume(eq(10L), any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/students/10/resume").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fileName").value("resume.pdf"))
                .andExpect(jsonPath("$.data.studentId").value(10));
    }

    @Test
    void testGetResume_Success() throws Exception {
        ResumeResponse mockResponse = ResumeResponse.builder()
                .documentId(1L)
                .studentId(10L)
                .fileName("resume.pdf")
                .resumeUrl("/api/files/download/resumes/resume.pdf")
                .downloadUrl("/api/students/10/resume/download")
                .fileSize(1024L)
                .status(DocumentStatus.PENDING)
                .uploadedAt(LocalDateTime.now())
                .build();

        when(resumeService.getResume(10L)).thenReturn(mockResponse);

        mockMvc.perform(get("/students/10/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fileName").value("resume.pdf"));
    }

    @Test
    void testDownloadResume_Success() throws Exception {
        Resource resource = new ByteArrayResource("PDF Content".getBytes()) {
            @Override
            public String getFilename() {
                return "resume.pdf";
            }
        };

        when(resumeService.downloadResume(10L)).thenReturn(resource);
        when(fileStorageService.getContentType("resume.pdf")).thenReturn("application/pdf");

        mockMvc.perform(get("/students/10/resume/download"))
                .andExpect(status().isOk());
    }
}
