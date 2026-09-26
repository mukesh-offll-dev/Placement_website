package com.gces.placementcell;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Read-only verification that the live database schema produced by schema.sql
 * matches what the JPA entities expect. Performs no writes.
 */
@SpringBootTest
@DisplayName("Schema Consistency Test")
class SchemaConsistencyTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                        "WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                Integer.class, table, column);
        return count != null && count > 0;
    }

    @Test
    @DisplayName("Normalised job_skills table exists with its unique constraint")
    void testJobSkillsTableProvisioned() {
        assertTrue(columnExists("job_skills", "job_id"));
        assertTrue(columnExists("job_skills", "skill_name"));

        Integer unique = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'uq_job_skill'", Integer.class);
        assertNotNull(unique);
        assertTrue(unique > 0, "uq_job_skill (job_id, skill_name) should exist");
    }

    @Test
    @DisplayName("notifications.notification_type CHECK accepts APPLICATION")
    void testNotificationTypeCheckWidened() {
        String definition = jdbcTemplate.queryForObject(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint " +
                        "WHERE conname = 'chk_notifications_type'", String.class);

        assertNotNull(definition, "chk_notifications_type should exist");
        assertTrue(definition.contains("APPLICATION"),
                "CHECK must allow APPLICATION, was: " + definition);
    }

    @Test
    @DisplayName("Columns the reshaped entities map to all exist")
    void testReshapedEntityColumnsExist() {
        // Job -> normalised company FK plus the columns the entity now declares
        assertTrue(columnExists("jobs", "company_id"), "jobs.company_id");
        assertTrue(columnExists("jobs", "job_role"), "jobs.job_role");
        assertTrue(columnExists("jobs", "ctc_text"), "jobs.ctc_text");
        assertTrue(columnExists("jobs", "ctc_value"), "jobs.ctc_value");
        assertTrue(columnExists("jobs", "vacancies"), "jobs.vacancies");
        assertTrue(columnExists("jobs", "job_type"), "jobs.job_type");
        assertTrue(columnExists("jobs", "posted_by"), "jobs.posted_by");
        assertTrue(columnExists("jobs", "posted_date"), "jobs.posted_date");

        // JobApplication
        assertTrue(columnExists("job_applications", "applied_on"), "job_applications.applied_on");
        assertTrue(columnExists("job_applications", "consent_given"), "job_applications.consent_given");

        // ApplicationTimeline
        assertTrue(columnExists("application_timeline", "stage_label"), "application_timeline.stage_label");
        assertTrue(columnExists("application_timeline", "stage_date"), "application_timeline.stage_date");
        assertTrue(columnExists("application_timeline", "updated_by"), "application_timeline.updated_by");
        assertTrue(columnExists("application_timeline", "display_order"), "application_timeline.display_order");

        // Notification broadcast model + per-user read state
        assertTrue(columnExists("notifications", "target_audience"), "notifications.target_audience");
        assertTrue(columnExists("notifications", "created_by"), "notifications.created_by");
        assertTrue(columnExists("notifications", "related_job_id"), "notifications.related_job_id");
        assertTrue(columnExists("notification_recipients", "is_read"), "notification_recipients.is_read");
        assertTrue(columnExists("notification_recipients", "read_at"), "notification_recipients.read_at");
    }

    @Test
    @DisplayName("Columns removed from the entities are genuinely absent from the schema")
    void testStaleColumnsAbsent() {
        assertFalse(columnExists("jobs", "title"), "jobs.title never existed");
        assertFalse(columnExists("jobs", "company"), "jobs.company was replaced by company_id");
        assertFalse(columnExists("jobs", "salary"), "jobs.salary was replaced by ctc_text/ctc_value");
        assertFalse(columnExists("jobs", "skills"), "CSV skills column replaced by job_skills table");
        assertFalse(columnExists("notifications", "recipient_id"), "replaced by notification_recipients");
        assertFalse(columnExists("notifications", "is_read"), "read state moved to notification_recipients");
    }

    @Test
    @DisplayName("Every table the entities target is present")
    void testEntityTablesPresent() {
        List<String> required = List.of(
                "users", "student_profiles", "student_education", "student_experience",
                "student_projects", "student_documents", "student_skills",
                "companies", "jobs", "job_skills", "job_requirements",
                "job_applications", "application_timeline",
                "notifications", "notification_recipients");

        for (String table : required) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables " +
                            "WHERE table_schema = 'public' AND table_name = ?",
                    Integer.class, table);
            assertNotNull(count);
            assertEquals(1, count.intValue(), "Missing table: " + table);
        }
    }
}
