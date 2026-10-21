# ============================================================
# Stage 1: Build the Spring Boot application
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Copy the POM first so the dependency layer is cached and only re-resolves when
# the POM itself changes, not on every source edit.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src

# Tests need a reachable PostgreSQL and are run in CI, not during the image
# build; a build here must not depend on a database being up.
RUN mvn -B -DskipTests package

# ============================================================
# Stage 2: Run the jar on a JRE
# ============================================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Run as a non-root user: a container process should not be root.
RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /build/target/*.jar app.jar

# Uploaded resumes and project media land here. Mount a volume over it in
# compose, otherwise the files disappear with the container.
RUN mkdir -p /app/uploads && chown -R spring:spring /app

USER spring

EXPOSE 8080

# Container memory, not the host's, decides the heap size.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
