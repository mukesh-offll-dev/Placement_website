package com.gces.placementcell;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * schema.sql runs at every startup, so it must apply cleanly on H2 (PostgreSQL mode) and be
 * re-runnable. Runs it twice against a private in-memory database and checks the upgrade objects
 * and the lifecycle backfill.
 */
@DisplayName("schema.sql on H2")
class SchemaSqlH2Test {

    @Test
    @DisplayName("Applies twice, creates the upgrade tables/columns, backfills DISABLED and enforces the new CHECKs")
    void schemaIsIdempotent() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
                "jdbc:h2:mem:schema_" + UUID.randomUUID().toString().replace("-", "")
                        + ";DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "sa", "");
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
        populator.execute(ds);
        JdbcTemplate jdbc = new JdbcTemplate(ds);

        jdbc.update("INSERT INTO users (email, password_hash, role, account_status, is_active) VALUES ('x@y.z', 'h', 'STUDENT', 'ACTIVE', FALSE)");
        Long userId = jdbc.queryForObject("SELECT id FROM users WHERE email = 'x@y.z'", Long.class);
        // An existing student row written before the upgrade columns existed gets the defaults.
        jdbc.update("INSERT INTO student_profiles (user_id, full_name, email) VALUES (?, 'Old', 'x@y.z')", userId);

        populator.execute(ds);

        for (String table : List.of("faculty_profiles", "student_profile_versions", "profile_verification_events",
                "student_certifications", "student_achievements", "audit_logs")) {
            assertEquals(1, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?", Integer.class, table), table);
        }
        assertEquals("DISABLED", jdbc.queryForObject("SELECT lifecycle_status FROM student_profiles WHERE user_id = ?",
                String.class, userId), "inactive login backfilled to DISABLED");
        assertEquals("NOT_SUBMITTED", jdbc.queryForObject(
                "SELECT profile_verification_status FROM student_profiles WHERE user_id = ?", String.class, userId));
        jdbc.update("INSERT INTO users (email, password_hash, role, account_status) VALUES ('f@y.z', 'h', 'FACULTY_ADVISOR', 'ACTIVE')");
        jdbc.update("UPDATE notifications SET action_url = NULL WHERE 1 = 0");
        assertThrows(Exception.class, () -> jdbc.update("UPDATE student_profiles SET lifecycle_status = 'GONE'"));
        assertThrows(Exception.class, () -> jdbc.update(
                "INSERT INTO users (email, password_hash, role, account_status) VALUES ('b@y.z', 'h', 'HACKER', 'ACTIVE')"));
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'student_profiles' "
                + "AND column_name IN ('github_url','linkedin_url','portfolio_url','archived_by','profile_verified_at')", Integer.class) == 5);
    }
}
