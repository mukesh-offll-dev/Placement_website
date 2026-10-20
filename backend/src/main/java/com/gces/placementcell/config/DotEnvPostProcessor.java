package com.gces.placementcell.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads .env / .env.local file before Spring context starts.
 * Injects DB credentials, JWT secrets, and other environment variables.
 *
 * Priority: System env vars always win over .env values (safe for CI/prod/Docker).
 */
public class DotEnvPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "dotenvProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        Map<String, Object> props = new LinkedHashMap<>();

        // Locate and load env files in order of precedence (.env first, then .env.local / .env.production)
        List<File> envFiles = locateEnvFiles();
        for (File envFile : envFiles) {
            loadFileIntoProps(envFile, props);
        }

        // Normalize cloud database URLs (e.g. postgres://user:pass@host/db from Neon/Render/Railway)
        normalizeDatabaseUrl(props, environment);

        if (!props.isEmpty()) {
            environment.getPropertySources().addAfter(
                "systemEnvironment",
                new MapPropertySource(PROPERTY_SOURCE_NAME, props)
            );
        }
    }

    private void loadFileIntoProps(File envFile, Map<String, Object> props) {
        if (envFile == null || !envFile.exists() || !envFile.isFile()) {
            return;
        }

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
    }

    /**
     * Finds .env files walking up from CWD.
     * Returns ordered list: base .env loaded first, then overrides (.env.local, .env.prod).
     */
    private List<File> locateEnvFiles() {
        List<File> files = new ArrayList<>();
        File dir = new File(System.getProperty("user.dir"));

        for (int i = 0; i < 4; i++) {
            if (dir == null) break;

            File baseEnv = new File(dir, ".env");
            File localEnv = new File(dir, ".env.local");
            File prodEnv = new File(dir, ".env.production");

            if (baseEnv.exists() && baseEnv.isFile()) files.add(baseEnv);
            if (localEnv.exists() && localEnv.isFile()) files.add(localEnv);
            if (prodEnv.exists() && prodEnv.isFile()) files.add(prodEnv);

            if (!files.isEmpty()) {
                break; // Stop at first directory containing .env files
            }
            dir = dir.getParentFile();
        }

        return files;
    }

    /**
     * Converts postgres:// or postgresql:// URI format (used by Neon, Render, Railway, Supabase)
     * into a valid JDBC URL and extracts username and password if not already set.
     */
    void normalizeDatabaseUrl(Map<String, Object> props, ConfigurableEnvironment environment) {
        String dbUrl = (String) props.get("DB_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = (String) props.get("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("DB_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("DATABASE_URL");
        }

        if (dbUrl != null && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
            try {
                String cleanUrl = dbUrl.replaceFirst("^postgres://", "http://")
                                       .replaceFirst("^postgresql://", "http://");
                URI uri = new URI(cleanUrl);

                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isBlank()) {
                    String[] parts = userInfo.split(":", 2);
                    if (parts.length > 0 && !parts[0].isBlank() &&
                            !props.containsKey("DB_USERNAME") && environment.getProperty("DB_USERNAME") == null) {
                        props.put("DB_USERNAME", parts[0]);
                    }
                    if (parts.length > 1 &&
                            !props.containsKey("DB_PASSWORD") && environment.getProperty("DB_PASSWORD") == null) {
                        props.put("DB_PASSWORD", parts[1]);
                    }
                }

                String host = uri.getHost();
                int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                String path = uri.getPath() != null ? uri.getPath() : "";
                String query = uri.getQuery();

                StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                        .append(host)
                        .append(":")
                        .append(port)
                        .append(path);

                if (query != null && !query.isBlank()) {
                    jdbcUrl.append("?").append(query);
                }

                props.put("DB_URL", jdbcUrl.toString());
                props.put("spring.datasource.url", jdbcUrl.toString());
            } catch (Exception ignored) {
                // If URI parsing fails, leave URL unchanged
            }
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }
}
