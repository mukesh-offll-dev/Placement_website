package com.gces.placementcell.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.gces.placementcell.config.FileStorageProperties;
import com.gces.placementcell.exception.BadRequestException;
import com.gces.placementcell.exception.ResourceNotFoundException;
import com.gces.placementcell.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Stores uploads in Cloudinary instead of on the server's disk (FILE_STORAGE=cloudinary).
 *
 * Files are uploaded as private ("authenticated") raw assets, so no Cloudinary link is ever handed to
 * a browser: downloads go through FileDownloadController and the resume/project endpoints, which check
 * who is asking, and this class then fetches the bytes with a signed URL. The value returned by
 * {@link #storeFile} is the same unique file name the local backend returns, so nothing stored in the
 * database changes shape.
 */
@Service
@Slf4j
@EnableConfigurationProperties(FileStorageProperties.class)
@ConditionalOnProperty(name = "file.storage", havingValue = "cloudinary")
public class CloudinaryFileStorageService implements FileStorageService {

    private static final String FOLDER = "placement-cell";
    private static final Map<String, Object> ASSET = Map.of("resource_type", "raw", "type", "authenticated");

    private final Cloudinary cloudinary;
    private final Function<String, byte[]> fetcher;

    @Autowired
    public CloudinaryFileStorageService(@Value("${cloudinary.url:}") String cloudinaryUrl) {
        this(build(cloudinaryUrl), CloudinaryFileStorageService::download);
    }

    /** Lets tests supply a fake Cloudinary client and fetcher. */
    CloudinaryFileStorageService(Cloudinary cloudinary, Function<String, byte[]> fetcher) {
        this.cloudinary = cloudinary;
        this.fetcher = fetcher;
    }

    private static Cloudinary build(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalStateException("FILE_STORAGE=cloudinary needs CLOUDINARY_URL "
                    + "(cloudinary://<api_key>:<api_secret>@<cloud_name>)");
        }
        return new Cloudinary(url);
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory, List<String> allowedExtensions, long maxSizeBytes) {
        String uniqueName = StoredFiles.validatedUniqueName(file, allowedExtensions, maxSizeBytes);
        try {
            cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId(subDirectory, uniqueName),
                    "resource_type", "raw",
                    "type", "authenticated",
                    "overwrite", true));
            return uniqueName;
        } catch (IOException | RuntimeException ex) {
            log.error("Cloudinary upload of {} failed: {}", uniqueName, ex.getMessage());
            throw new RuntimeException("Could not store the file. Please try again.", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String subDirectory, String fileName) {
        String url = cloudinary.url().resourceType("raw").type("authenticated").secure(true).signed(true)
                .generate(publicId(subDirectory, fileName));
        try {
            byte[] bytes = fetcher.apply(url);
            return new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            };
        } catch (FileMissingException ex) {
            throw new ResourceNotFoundException("File not found: " + fileName);
        }
    }

    @Override
    public boolean deleteFile(String subDirectory, String fileName) {
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId(subDirectory, fileName), ASSET);
            return "ok".equals(result.get("result"));
        } catch (IOException | RuntimeException ex) {
            log.warn("Cloudinary delete of {} failed: {}", fileName, ex.getMessage());
            return false;
        }
    }

    @Override
    public String getContentType(String fileName) {
        return StoredFiles.contentType(fileName);
    }

    /** Folder/name only; both parts are cleaned so a request cannot reach outside the app's folder. */
    private static String publicId(String subDirectory, String fileName) {
        String dir = subDirectory == null ? "" : subDirectory.replaceAll("[^a-zA-Z0-9_-]", "");
        if (fileName == null || fileName.contains("/") || fileName.contains("\\") || fileName.contains("..")) {
            throw new BadRequestException("Invalid file name");
        }
        return FOLDER + "/" + dir + "/" + fileName;
    }

    private static byte[] download(String url) {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            HttpResponse<byte[]> response = client.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30)).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 404) {
                throw new FileMissingException();
            }
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Cloudinary answered " + response.statusCode());
            }
            return response.body();
        } catch (IOException ex) {
            throw new IllegalStateException("Cloudinary could not be reached", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while downloading the file", ex);
        }
    }

    /** The asset does not exist (404). */
    public static class FileMissingException extends RuntimeException {
    }
}
