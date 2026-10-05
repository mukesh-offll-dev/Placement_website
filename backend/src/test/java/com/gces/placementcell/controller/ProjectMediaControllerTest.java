package com.gces.placementcell.controller;

import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.dto.response.FileUploadResponse;
import com.gces.placementcell.dto.response.ProjectMediaResponse;
import com.gces.placementcell.service.FileStorageService;
import com.gces.placementcell.service.ProjectMediaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
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

@WebMvcTest(ProjectMediaController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProjectMediaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectMediaService projectMediaService;

    @MockBean
    private FileStorageService fileStorageService;

    // AdminAuthFilter is a servlet-filter bean, so the MVC slice constructs it even with
    // addFilters = false; its dependencies are not part of the slice and must be mocked.
    @MockBean
    private com.gces.placementcell.security.TokenProvider tokenProvider;

    @MockBean
    private com.gces.placementcell.repository.UserRepository userRepository;

    @Test
    void testUploadStandalone_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "screenshot.png",
                "image/png",
                "Image bytes".getBytes()
        );

        FileUploadResponse mockResponse = FileUploadResponse.builder()
                .fileName("stored_screenshot.png")
                .originalFileName("screenshot.png")
                .fileUrl("/api/files/download/projects/stored_screenshot.png")
                .downloadUrl("/api/files/download/projects/stored_screenshot.png")
                .contentType("image/png")
                .size(1024L)
                .uploadedAt(LocalDateTime.now())
                .build();

        when(projectMediaService.uploadMediaStandalone(any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/projects/media/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fileName").value("stored_screenshot.png"));
    }

    @Test
    void testUploadProjectMedia_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "screenshot.png",
                "image/png",
                "Image bytes".getBytes()
        );

        ProjectMediaResponse mockResponse = ProjectMediaResponse.builder()
                .projectId(5L)
                .fileName("stored_screenshot.png")
                .mediaUrl("/api/files/download/projects/stored_screenshot.png")
                .downloadUrl("/api/projects/5/media/download")
                .contentType("image/png")
                .fileSize(1024L)
                .uploadedAt(LocalDateTime.now())
                .build();

        when(projectMediaService.uploadProjectMedia(eq(5L), any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/projects/5/media").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.projectId").value(5));
    }
}
