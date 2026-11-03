package com.gces.placementcell.service;

import com.gces.placementcell.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Register number rules")
class StudentIdentityTest {

    @Test
    @DisplayName("Register numbers are trimmed and uppercased, so duplicates cannot differ by case")
    void normalizes() {
        assertEquals("811521104001", StudentIdentity.normalize("  811521104001 "));
        assertEquals("CS-2022-01", StudentIdentity.normalize("cs-2022-01"));
        assertNull(StudentIdentity.normalize(null));
        assertEquals("830123104032", StudentIdentity.requireValid(" 830123104032 "));
    }

    @Test
    @DisplayName("Anything other than exactly 12 digits is rejected")
    void rejectsInvalid() {
        for (String bad : new String[]{null, "", "   ", "83012310403", "8301231040321", "83012310403A", "ABC123456789", "8301 2310 4032", "830123104-32", "CS2022001"}) {
            assertThrows(BadRequestException.class, () -> StudentIdentity.requireValid(bad), "should reject: " + bad);
        }
    }

    @Test
    @DisplayName("A range runs from the first to the last number inclusive, keeping the leading zeros")
    void expandsRange() {
        assertEquals(List.of("811521104001", "811521104002", "811521104003"),
                StudentIdentity.expandRange("811521104001", "811521104003"));
        assertEquals(List.of("830123104009", "830123104010", "830123104011"),
                StudentIdentity.expandRange("830123104009", "830123104011"));
        assertEquals(List.of("830123104001"), StudentIdentity.expandRange("830123104001", "830123104001"));
    }

    @Test
    @DisplayName("A range must share the prefix and digit length, run forwards, and stay within the cap")
    void rejectsBadRanges() {
        assertThrows(BadRequestException.class, () -> StudentIdentity.expandRange("811521104001", "811621104005"));
        assertThrows(BadRequestException.class, () -> StudentIdentity.expandRange("830123104001", "83012310405"));
        assertThrows(BadRequestException.class, () -> StudentIdentity.expandRange("830123104010", "830123104005"));
        assertThrows(BadRequestException.class, () -> StudentIdentity.expandRange("ABCDEFGHIJKL", "ABCDEFGHIJKZ"));

        assertEquals(StudentIdentity.MAX_BULK, StudentIdentity.expandRange("830123104001", "830123104100").size());
        assertThrows(BadRequestException.class, () -> StudentIdentity.expandRange("830123104001", "830123104101"),
                "one more than the cap");
    }

    @Test
    @DisplayName("The batch comes from the graduation year")
    void batchForYear() {
        assertEquals("2022-2026", StudentIdentity.batchForYear(2026));
        assertNull(StudentIdentity.batchForYear(null));
    }

    @Test
    @DisplayName("The department code comes from the brackets or a known name")
    void departmentCodes() {
        assertEquals("CSE", StudentIdentity.departmentCode("Computer Science (CSE)"));
        assertEquals("IT", StudentIdentity.departmentCode("Information Technology"));
        assertEquals("CIVIL", StudentIdentity.departmentCode("Civil Engineering"));
        assertEquals("ECE", StudentIdentity.departmentCode("Electronics (ECE)"));
        assertEquals("AD", StudentIdentity.departmentCode("Artificial Data"));
        assertNull(StudentIdentity.departmentCode("  "));
    }

    @Test
    @DisplayName("Stand-in emails are recognised, hidden from the API, and unique per register number")
    void placeholderEmails() {
        String a = StudentIdentity.placeholderEmail("ABC-123");
        String b = StudentIdentity.placeholderEmail("ABC123");
        String c = StudentIdentity.placeholderEmail("abc-123");

        assertNotEquals(a, b, "punctuation must not collapse two different register numbers into one address");
        assertEquals(a, c, "case does not matter");
        assertTrue(StudentIdentity.isPlaceholderEmail(a));
        assertTrue(StudentIdentity.isPlaceholderEmail("X@PENDING.GCES.LOCAL"));
        assertFalse(StudentIdentity.isPlaceholderEmail("asha@example.com"));
        assertNull(StudentIdentity.visibleEmail(a));
        assertEquals("asha@example.com", StudentIdentity.visibleEmail("asha@example.com"));
    }
}
