# ── Stage 1: Build Backend JAR from Root Context ─────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and pom.xml from backend
COPY backend/pom.xml .
COPY backend/.mvn/ .mvn/
COPY backend/mvnw .
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline -B -q || true

# Copy backend source code and build production jar
COPY backend/src/ src/
RUN ./mvnw clean package -DskipTests -B -q

# ── Stage 2: Production Runtime ──────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S stockpulse && adduser -S stockpulse -G stockpulse
USER stockpulse

COPY --from=builder /app/target/stockpulse-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]
