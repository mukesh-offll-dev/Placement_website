package com.gces.placementcell.dto.profile;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** The verifiable sections of a profile; the keys used in changedSections and sectionComments. */
public enum ProfileSection {
    PERSONAL,
    ACADEMIC,
    SKILLS,
    EDUCATION,
    EXPERIENCE,
    PROJECTS,
    CERTIFICATIONS,
    ACHIEVEMENTS,
    RESUME,
    DOCUMENTS;

    public static boolean isValid(String key) {
        return key != null && Arrays.stream(values()).anyMatch(s -> s.name().equals(key.trim().toUpperCase(Locale.ROOT)));
    }

    /** Parses "PERSONAL,SKILLS" (unknown keys are dropped). */
    public static Set<ProfileSection> parse(String csv) {
        Set<ProfileSection> result = new LinkedHashSet<>();
        if (csv == null || csv.isBlank()) {
            return result;
        }
        for (String part : csv.split(",")) {
            if (isValid(part)) {
                result.add(valueOf(part.trim().toUpperCase(Locale.ROOT)));
            }
        }
        return result;
    }

    public static String join(Collection<ProfileSection> sections) {
        EnumSet<ProfileSection> ordered = sections.isEmpty() ? EnumSet.noneOf(ProfileSection.class) : EnumSet.copyOf(sections);
        return ordered.stream().map(Enum::name).collect(Collectors.joining(","));
    }
}
