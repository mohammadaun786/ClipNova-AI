# ===================================================
# Stage 1: Build React Frontend
# ===================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Build static SPA
COPY frontend/ ./
RUN npm run build

# ===================================================
# Stage 2: Python Backend with FFmpeg
# ===================================================
FROM python:3.11-slim

# Install system dependencies: FFmpeg, libass, and fonts for ASS subtitle rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fonts-dejavu-core \
    libass-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (Required for Hugging Face Spaces UID 1000 compatibility)
RUN useradd -m -u 1000 appuser

WORKDIR /home/appuser/app

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code & assets
COPY --chown=appuser:appuser backend/ ./backend/

# Copy compiled frontend from Stage 1 into the location expected by backend/app/main.py
COPY --chown=appuser:appuser --from=frontend-builder /build/frontend/dist ./frontend/dist

# Ensure required directories exist and give permissions to appuser
RUN mkdir -p backend/output/temp backend/output/rendered backend/assets/backgrounds \
    && chown -R appuser:appuser /home/appuser/app

USER appuser

# Hugging Face Spaces defaults to 7860; Render / Koyeb set $PORT dynamically
ENV PORT=7860
EXPOSE 7860

# Launch FastAPI app with Uvicorn
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
