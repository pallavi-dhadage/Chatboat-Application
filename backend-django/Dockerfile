# =============================================================================
# backend-django — Multi-stage Dockerfile
# Stage 1 (builder): install Python dependencies into a venv
# Stage 2 (runtime): copy venv, run gunicorn WSGI server
# =============================================================================

# ---- Builder stage -----------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---- Runtime stage -----------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Collect Django static files (admin CSS/JS) at build time
RUN python manage.py collectstatic --noinput || true

# Non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# Create superuser from env vars (if not exists) then start gunicorn
CMD ["sh", "-c", "python manage.py migrate --run-syncdb && python manage.py shell -c \"from django.contrib.auth import get_user_model; U=get_user_model(); U.objects.filter(username='admin').exists() or U.objects.create_superuser('admin', 'admin@example.com', 'adminpass')\" && gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 60 chatapp.wsgi:application"]
