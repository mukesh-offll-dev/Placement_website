package com.gces.placementcell.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.impl.CloudinaryFileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Cloudinary file storage")
class CloudinaryFileStorageServiceTest {

    private Cloudinary cloudinary;
    private Uploader uploader;
    private Function<String, byte[]> fetcher;
    private CloudinaryFileStorageService storage;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        cloudinary = new Cloudinary("cloudinary://123456:secret@democloud");
        uploader = mock(Uploader.class);
        cloudinary = org.mockito.Mockito.spy(cloudinary);
        when(cloudinary.uploader()).thenReturn(uploader);
        fetcher = mock(Function.class);
        // Same-package constructor is package-private in the impl package, so go through reflection-free path:
        storage = newStorage();
    }

    private CloudinaryFileStorageService newStorage() {
        try {
            var ctor = CloudinaryFileStorageService.class.getDeclaredConstructor(Cloudinary.class, Function.class);
            ctor.setAccessible(true);
            return ctor.newInstance(cloudinary, fetcher);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    @DisplayName("Uploads as a private raw asset and returns the unique file name")
    void stores() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "My Resume.pdf", "application/pdf", "pdf".getBytes());

        String name = storage.storeFile(file, "resumes", List.of("pdf"), 1024);

        assertTrue(name.endsWith("_My_Resume.pdf"));
        ArgumentCaptor<Map<String, Object>> options = ArgumentCaptor.forClass(Map.class);
        verify(uploader).upload(any(byte[].class), options.capture());
        assertEquals("placement-cell/resumes/" + name, options.getValue().get("public_id"));
        assertEquals("raw", options.getValue().get("resource_type"));
        assertEquals("authenticated", options.getValue().get("type"), "resumes must not be publicly readable");
    }

    @Test
    @DisplayName("Applies the same type and size rules as local storage, before anything is uploaded")
    void validates() throws Exception {
        assertThrows(BadRequestException.class, () -> storage.storeFile(
                new MockMultipartFile("file", "a.exe", "application/octet-stream", "x".getBytes()), "resumes", List.of("pdf"), 1024));
        assertThrows(BadRequestException.class, () -> storage.storeFile(
                new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[2048]), "resumes", List.of("pdf"), 1024));
        assertThrows(BadRequestException.class, () -> storage.storeFile(
                new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[0]), "resumes", List.of("pdf"), 1024));
        verify(uploader, never()).upload(any(byte[].class), anyMap());
    }

    @Test
    @DisplayName("A failed upload is reported without leaking Cloudinary details")
    void uploadFailure() throws Exception {
        when(uploader.upload(any(byte[].class), anyMap())).thenThrow(new IOException("boom: secret details"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> storage.storeFile(
                new MockMultipartFile("file", "a.pdf", "application/pdf", "x".getBytes()), "resumes", List.of("pdf"), 1024));
        assertFalse(ex.getMessage().contains("secret"));
    }

    @Test
    @DisplayName("Downloads fetch a signed, private URL and return the bytes")
    void loads() {
        when(fetcher.apply(any())).thenReturn("hello".getBytes());

        Resource resource = storage.loadFileAsResource("resumes", "abc_cv.pdf");

        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        verify(fetcher).apply(url.capture());
        assertTrue(url.getValue().startsWith("https://res.cloudinary.com/democloud/raw/authenticated/"), url.getValue());
        assertTrue(url.getValue().contains("s--"), "the URL must be signed");
        assertTrue(url.getValue().endsWith("placement-cell/resumes/abc_cv.pdf"), url.getValue());
        assertFalse(url.getValue().contains("secret"));
        assertEquals("abc_cv.pdf", resource.getFilename());
    }

    @Test
    @DisplayName("A missing file is a 404, not a server error")
    void missing() {
        when(fetcher.apply(any())).thenThrow(new CloudinaryFileStorageService.FileMissingException());
        assertThrows(ResourceNotFoundException.class, () -> storage.loadFileAsResource("resumes", "gone.pdf"));
    }

    @Test
    @DisplayName("File names cannot reach outside the app's folder")
    void rejectsTraversal() throws Exception {
        assertThrows(BadRequestException.class, () -> storage.loadFileAsResource("resumes", "../other/secret.pdf"));
        assertFalse(storage.deleteFile("resumes", "a/b.pdf"));
        verify(uploader, never()).destroy(any(), anyMap());
    }

    @Test
    @DisplayName("Delete reports whether Cloudinary removed the file")
    void deletes() throws Exception {
        when(uploader.destroy(any(), anyMap())).thenReturn(Map.of("result", "ok"));
        assertTrue(storage.deleteFile("resumes", "abc_cv.pdf"));

        when(uploader.destroy(any(), anyMap())).thenReturn(Map.of("result", "not found"));
        assertFalse(storage.deleteFile("resumes", "abc_cv.pdf"));

        when(uploader.destroy(any(), anyMap())).thenThrow(new IOException("down"));
        assertFalse(storage.deleteFile("resumes", "abc_cv.pdf"));
    }
}
