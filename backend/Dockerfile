# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit

# Build frontend production bundle
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build Backend JAR ───────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app

# Copy Maven wrapper and pom.xml first (layer cache: only re-download deps when pom changes)
COPY backend/pom.xml .
COPY backend/.mvn/ .mvn/
COPY backend/mvnw .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy backend source
COPY backend/src/ src/

# Copy compiled frontend distribution into Spring Boot's static resources directory
COPY --from=frontend-builder /build/frontend/dist/ src/main/resources/static/

RUN ./mvnw package -DskipTests -q

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S stockpulse && adduser -S stockpulse -G stockpulse
USER stockpulse

COPY --from=backend-builder /app/target/stockpulse-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]
