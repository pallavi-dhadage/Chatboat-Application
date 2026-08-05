# =============================================================================
# ai-services — Multi-stage Dockerfile
# Stage 1 (builder): install heavy ML dependencies into a venv
# Stage 2 (runtime): copy venv + models, expose as importable package
#
# NOTE: This image is large (~3-4 GB) due to TensorFlow + PyTorch + OpenCV.
# In production, consider splitting into separate model-serving containers.
# =============================================================================

# ---- Builder stage -----------------------------------------------------------
# Use the slim TensorFlow base which already has CUDA stubs if needed
FROM python:3.11-slim AS builder

WORKDIR /build

# System dependencies for OpenCV, numpy, and native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libpq-dev \
        libglib2.0-0 \
        libsm6 \
        libxrender1 \
        libxext6 \
        libgomp1 \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---- Runtime stage -----------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime system deps (OpenCV needs libGL and glib)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxrender1 \
        libxext6 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy package source and pre-trained model files
COPY . .

# Non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# ai-services is imported as a package by backend-flask (in-process call)
# This container can also be run standalone as a model warm-up / healthcheck
CMD ["python", "-c", "import classifier; import sentiment; print('AI models loaded OK')"]
