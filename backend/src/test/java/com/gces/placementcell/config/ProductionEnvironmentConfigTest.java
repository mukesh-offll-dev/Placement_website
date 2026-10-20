package com.gces.placementcell.config;

import com.gces.placementcell.security.JwtService;
import com.gces.placementcell.security.TokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Production Environment Configuration and Security Tests")
class ProductionEnvironmentConfigTest {

    @Test
    @DisplayName("DotEnvPostProcessor normalizes cloud postgres URI into JDBC format and extracts credentials")
    void testNormalizeCloudPostgresUri() {
        DotEnvPostProcessor processor = new DotEnvPostProcessor();
        MockEnvironment environment = new MockEnvironment();
        Map<String, Object> props = new LinkedHashMap<>();

        props.put("DATABASE_URL", "postgres://neon_user:neon_secret_pass@ep-cool-fog.us-east-2.aws.neon.tech:5432/neondb?sslmode=require");

        processor.normalizeDatabaseUrl(props, environment);

        assertEquals("jdbc:postgresql://ep-cool-fog.us-east-2.aws.neon.tech:5432/neondb?sslmode=require", props.get("DB_URL"));
        assertEquals("jdbc:postgresql://ep-cool-fog.us-east-2.aws.neon.tech:5432/neondb?sslmode=require", props.get("spring.datasource.url"));
        assertEquals("neon_user", props.get("DB_USERNAME"));
        assertEquals("neon_secret_pass", props.get("DB_PASSWORD"));
    }

    @Test
    @DisplayName("DotEnvPostProcessor leaves compliant jdbc:postgresql URL untouched")
    void testStandardJdbcUrlRemainsUntouched() {
        DotEnvPostProcessor processor = new DotEnvPostProcessor();
        MockEnvironment environment = new MockEnvironment();
        Map<String, Object> props = new LinkedHashMap<>();

        String standardJdbc = "jdbc:postgresql://localhost:5432/placement_cell?sslmode=prefer";
        props.put("DB_URL", standardJdbc);
        props.put("DB_USERNAME", "prod_user");
        props.put("DB_PASSWORD", "prod_pass");

        processor.normalizeDatabaseUrl(props, environment);

        assertEquals(standardJdbc, props.get("DB_URL"));
        assertEquals("prod_user", props.get("DB_USERNAME"));
        assertEquals("prod_pass", props.get("DB_PASSWORD"));
        assertNull(props.get("spring.datasource.url"));
    }

    @Test
    @DisplayName("JwtService successfully signs and validates tokens using production-grade 256-bit secret")
    void testJwtServiceWithProductionSecret() {
        JwtService jwtService = new JwtService();
        String prodSecret = "c2VjdXJlLXByb2R1Y3Rpb24tc2VjcmV0LWtleS13aXRoLWVub3VnaC1lbnRyb3B5LTIwMjY=";
        ReflectionTestUtils.setField(jwtService, "secretKey", prodSecret);
        ReflectionTestUtils.setField(jwtService, "expirationMs", 3600000L);

        UserDetails userDetails = new User("admin@gces.edu", "password", Collections.emptyList());

        String token = jwtService.generateToken(userDetails);
        assertNotNull(token);
        assertFalse(token.isBlank());
        assertTrue(token.split("\\.").length == 3, "JWT must consist of header.payload.signature");

        assertTrue(jwtService.isTokenValid(token, userDetails));
        assertEquals("admin@gces.edu", jwtService.extractUsername(token));
        assertFalse(jwtService.isTokenExpired(token));
    }

    @Test
    @DisplayName("TokenProvider successfully generates signed tokens with production-grade secret")
    void testTokenProviderWithProductionSecret() {
        String prodSecret = "c2VjdXJlLXByb2R1Y3Rpb24tc2VjcmV0LWtleS13aXRoLWVub3VnaC1lbnRyb3B5LTIwMjY=";
        TokenProvider tokenProvider = new TokenProvider(prodSecret, 3600000L, null);

        com.gces.placementcell.entity.User user = com.gces.placementcell.entity.User.builder()
                .id(999L)
                .email("officer@gces.edu")
                .role(com.gces.placementcell.entity.enums.UserRole.PLACEMENT_OFFICER)
                .build();

        String token = tokenProvider.generateToken(user);
        assertNotNull(token);
        assertTrue(token.contains("."));
        assertEquals(2, token.split("\\.").length);
    }
}
