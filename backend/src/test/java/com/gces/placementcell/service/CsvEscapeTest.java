package com.gces.placementcell.service;

import com.gces.placementcell.service.impl.AdminStudentServiceImplCsvAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The placement report is opened in Excel, and students write their own name and
 * phone. These pin down that nothing a student types becomes a live formula and
 * that the CSV stays well-formed.
 */
@DisplayName("Placement report CSV escaping")
class CsvEscapeTest {

    private static String esc(String value) {
        return AdminStudentServiceImplCsvAccess.escape(value);
    }

    @Test
    @DisplayName("Formula prefixes are neutralised so Excel shows text")
    void neutralisesFormulas() {
        for (String attack : new String[] {
                "=HYPERLINK(\"http://evil.example\",\"click\")",
                "+1+1",
                "-2+3",
                "@SUM(A1:A2)",
                "\t=1+1"}) {
            String out = esc(attack);
            String unquoted = out.startsWith("\"") ? out.substring(1) : out;
            assertTrue(unquoted.startsWith("'"),
                    "should be prefixed with an apostrophe: " + attack + " -> " + out);
        }
    }

    @Test
    @DisplayName("Commas, quotes and newlines cannot break the row")
    void keepsRowsWellFormed() {
        assertEquals("\"Rao, Asha\"", esc("Rao, Asha"));
        assertEquals("\"say \"\"hi\"\"\"", esc("say \"hi\""));
        assertFalse(esc("line1\nline2").contains("\n"));
    }

    @Test
    @DisplayName("Ordinary values pass through unchanged")
    void leavesNormalValuesAlone() {
        assertEquals("Asha Rao", esc("Asha Rao"));
        assertEquals("CSE", esc("CSE"));
        assertEquals("", esc(null));
    }
}
