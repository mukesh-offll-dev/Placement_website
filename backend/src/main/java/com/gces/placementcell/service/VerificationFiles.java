package com.gces.placementcell.service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Naming rules for evidence and profile files uploaded for verification (storage category
 * "verification"). The stored name embeds the owning student profile id ("<12 chars>_v<id>_name.ext"),
 * set by the server at upload, so ownership can be checked without another table.
 */
public final class VerificationFiles {

    public static final String CATEGORY = "verification";
    public static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "png", "jpg", "jpeg", "webp");

    private static final Pattern OWNER = Pattern.compile("^[^_/\\\\]{12}_v(\\d+)_[^/\\\\]*$");
    private static final Pattern FILE_URL = Pattern.compile("^/api/files/(?:download|view)/([A-Za-z0-9_-]+)/([A-Za-z0-9._-]+)$");

    private VerificationFiles() {
    }

    /** Prefix given to the original file name so the stored name records its owner. */
    public static String ownerPrefix(Long studentProfileId) {
        return "v" + studentProfileId + "_";
    }

    public static String urlFor(String storedFileName) {
        return "/api/files/download/" + CATEGORY + "/" + storedFileName;
    }

    /** The owning student profile id of a stored verification file name, or null. */
    public static Long ownerOf(String storedFileName) {
        if (storedFileName == null) {
            return null;
        }
        Matcher m = OWNER.matcher(storedFileName);
        if (!m.matches()) {
            return null;
        }
        try {
            return Long.parseLong(m.group(1));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** [category, fileName] of an "/api/files/{download|view}/{category}/{name}" URL, or null. */
    public static String[] parseFileUrl(String url) {
        if (url == null) {
            return null;
        }
        Matcher m = FILE_URL.matcher(url.trim());
        return m.matches() ? new String[]{m.group(1), m.group(2)} : null;
    }

    /** Whether the URL is a verification file owned by this student. */
    public static boolean isOwnedVerificationUrl(String url, Long studentProfileId) {
        String[] parts = parseFileUrl(url);
        return parts != null && CATEGORY.equals(parts[0]) && studentProfileId != null
                && studentProfileId.equals(ownerOf(parts[1]));
    }
}
