# =============================================================================
# backend-flask — Multi-stage Dockerfile
# Stage 1 (builder): install Python dependencies into a venv
# Stage 2 (runtime): copy venv, run gunicorn with eventlet worker
# =============================================================================

# ---- Builder stage -----------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies for native extensions (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create an isolated virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---- Runtime stage -----------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime system dependencies only (libpq for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        wget \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY . .

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Expose Flask port
EXPOSE 5000

# Copy and make entrypoint script executable
COPY --chown=appuser:appgroup entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Entrypoint: waits for PostgreSQL, runs Alembic migrations, starts gunicorn
ENTRYPOINT ["/app/entrypoint.sh"]
