# ============================================================
# Stage 1: Build the Spring Boot application
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Use Google's Maven Central mirror to avoid HTTP 429 rate-limits from repo.maven.apache.org
# on Render's shared build runners, and cap concurrent downloads.
RUN printf '%s\n' \
    '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"' \
    '          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' \
    '          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">' \
    '  <mirrors>' \
    '    <mirror>' \
    '      <id>google-maven-central</id>' \
    '      <name>Google GCS Maven Central Mirror</name>' \
    '      <url>https://maven-central-asia.storage-download.googleapis.com/maven2/</url>' \
    '      <mirrorOf>central</mirrorOf>' \
    '    </mirror>' \
    '  </mirrors>' \
    '</settings>' > /opt/maven-settings.xml

# Copy the POM first so the dependency layer is cached and only re-resolves when
# the POM itself changes, not on every source edit.
COPY pom.xml .
RUN mvn -B -s /opt/maven-settings.xml -Dmaven.artifact.threads=2 dependency:go-offline dependency:resolve-plugins

COPY src ./src

# Tests need a reachable PostgreSQL and are run in CI, not during the image
# build; a build here must not depend on a database being up.
RUN mvn -B -s /opt/maven-settings.xml -Dmaven.artifact.threads=2 -DskipTests package

# ============================================================
# Stage 2: Run the jar on a JRE
# ============================================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Run as a non-root user: a container process should not be root.
RUN addgroup -S spring && adduser -S spring -G spring && apk add --no-cache su-exec

COPY --from=build /build/target/*.jar app.jar

# Uploaded resumes and project media land here. Mount a volume over it in
# compose, otherwise the files disappear with the container.
RUN mkdir -p /app/uploads && chown -R spring:spring /app


EXPOSE 8080

# Container memory, not the host's, decides the heap size.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

# Starts as root only to fix ownership of a mounted disk (Render mounts disks as root), then drops to the
# unprivileged user for the JVM.
ENTRYPOINT ["sh", "-c", "chown -R spring:spring /app/uploads && exec su-exec spring java $JAVA_OPTS -jar /app/app.jar"]
