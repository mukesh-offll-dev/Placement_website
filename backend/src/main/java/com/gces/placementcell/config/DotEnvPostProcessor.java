package com.gces.placementcell.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Loads .env file from the project root before Spring context starts.
 * This runs early enough to activate profiles (e.g. SPRING_PROFILES_ACTIVE=prod)
 * and inject DB credentials (DB_URL, DB_USERNAME, DB_PASSWORD).
 *
 * Priority: System env vars always win over .env values (safe for CI/prod).
 */
public class DotEnvPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "dotenvFile";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        // If a system-level SPRING_PROFILES_ACTIVE already exists, respect it and stop
        if (System.getenv("SPRING_PROFILES_ACTIVE") != null) return;

        File envFile = locateDotEnv();

        if (envFile == null) {
            // No .env file → fall back to dev profile
            environment.addActiveProfile("dev");
            return;
        }

        Map<String, Object> props = new LinkedHashMap<>();
        boolean profileSet = false;

        try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                int eq = line.indexOf('=');
                if (eq <= 0) continue;

                String key   = line.substring(0, eq).trim();
                String value = line.substring(eq + 1).trim();

                // Strip surrounding quotes
                if (value.length() >= 2 &&
                    ((value.startsWith("\"") && value.endsWith("\"")) ||
                     (value.startsWith("'")  && value.endsWith("'")))) {
                    value = value.substring(1, value.length() - 1);
                }

                // System env always takes precedence
                if (System.getenv(key) != null) continue;

                if ("SPRING_PROFILES_ACTIVE".equals(key)) {
                    for (String profile : value.split(",")) {
                        environment.addActiveProfile(profile.trim());
                    }
                    profileSet = true;
                } else {
                    props.put(key, value);
                }
            }
        } catch (Exception ignored) {
            // .env is optional — silently skip if unreadable
        }

        // No SPRING_PROFILES_ACTIVE in .env → default to dev
        if (!profileSet) {
            environment.addActiveProfile("dev");
        }

        if (!props.isEmpty()) {
            // Add right after systemEnvironment so these behave like real env vars
            environment.getPropertySources().addAfter(
                "systemEnvironment",
                new MapPropertySource(PROPERTY_SOURCE_NAME, props)
            );
        }
    }

    /** Walk up from CWD to find the .env file (handles running from any subdir). */
    private File locateDotEnv() {
        File dir = new File(System.getProperty("user.dir"));
        for (int i = 0; i < 4; i++) {
            if (dir == null) break;
            File f = new File(dir, ".env");
            if (f.exists() && f.isFile()) return f;
            dir = dir.getParentFile();
        }
        return null;
    }

    @Override
    public int getOrder() {
        // Run before ConfigDataApplicationListener (order = 0) so profiles are set early
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }
}
