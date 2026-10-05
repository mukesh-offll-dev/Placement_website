package com.gces.placementcell;

import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Boots the application with hibernate.ddl-auto=validate, which makes Hibernate compare
 * every @Entity mapping against the live schema and fail startup on any missing table,
 * missing column or incompatible type.
 *
 * The production config uses ddl-auto=none (schema.sql owns the DDL), so without this
 * test a renamed or dropped column stays invisible until a query actually runs — which
 * is how several mappings drifted during the branch merges.
 */
@PostgresSchemaTest
@DisplayName("Entity/Schema Validation Test")
class EntitySchemaValidationTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("Every entity mapping validates against the live PostgreSQL schema")
    void testAllEntityMappingsValidateAgainstSchema() {
        // Reaching this point already proves validation passed: Hibernate runs it while
        // building the EntityManagerFactory, so a mismatch fails context startup.
        var entities = entityManager.getMetamodel().getEntities();

        assertFalse(entities.isEmpty(), "No entities were discovered by the persistence unit");
        assertEquals(25, entities.size(),
                "Expected one entity per table in schema.sql. Found: "
                        + entities.stream().map(EntityType::getName).sorted().toList());
    }
}
