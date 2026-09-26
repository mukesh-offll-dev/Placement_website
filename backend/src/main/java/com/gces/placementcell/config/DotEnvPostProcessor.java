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
 * Loads .env / .env.local file before Spring context starts.
 * Injects DB credentials and other environment variables.
 *
 * Priority: System env vars always win over .env values (safe for CI/prod).
 */
public class DotEnvPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "dotenvProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        File envFile = locateEnvFile();
        if (envFile == null) {
            return;
        }

        Map<String, Object> props = new LinkedHashMap<>();

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

                props.put(key, value);
            }
        } catch (Exception ignored) {
            // .env is optional — silently skip if unreadable
        }

        if (!props.isEmpty()) {
            environment.getPropertySources().addAfter(
                "systemEnvironment",
                new MapPropertySource(PROPERTY_SOURCE_NAME, props)
            );
        }
    }

    /** Walk up from CWD to find .env or .env.local */
    private File locateEnvFile() {
        File dir = new File(System.getProperty("user.dir"));
        for (int i = 0; i < 4; i++) {
            if (dir == null) break;
            File f = new File(dir, ".env");
            if (f.exists() && f.isFile()) return f;
            File fLocal = new File(dir, ".env.local");
            if (fLocal.exists() && fLocal.isFile()) return fLocal;
            dir = dir.getParentFile();
        }
        return null;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }
}
