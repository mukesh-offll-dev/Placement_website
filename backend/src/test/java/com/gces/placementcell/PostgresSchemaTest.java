package com.gces.placementcell;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Runs a test against a real, dedicated PostgreSQL test database with schema.sql applied.
 *
 * The default test profile uses in-memory H2 with tables generated from the entities, which
 * cannot tell us whether the entities match the PostgreSQL schema that production runs on.
 * Tests carrying this annotation check exactly that, so they need real PostgreSQL.
 *
 * They are skipped unless TEST_DB_URL points at a PostgreSQL database. Deliberately not
 * DB_URL: these tests must never be aimed at the production database by accident.
 *
 *   TEST_DB_URL=jdbc:postgresql://localhost:5432/placement_cell_test
 *   TEST_DB_USERNAME=...   TEST_DB_PASSWORD=...
 *
 * schema.sql is idempotent (CREATE ... IF NOT EXISTS) and ddl-auto is validate, so nothing
 * is dropped.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:postgresql:.+")
@SpringBootTest(properties = {
        "spring.datasource.url=${TEST_DB_URL}",
        "spring.datasource.username=${TEST_DB_USERNAME:}",
        "spring.datasource.password=${TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:schema.sql",
        "spring.jpa.hibernate.ddl-auto=validate"
})
public @interface PostgresSchemaTest {
}
