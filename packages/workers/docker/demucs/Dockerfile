# Demucs Vocal Isolation Service
# Provides REST API for vocal separation using Demucs

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python packages
RUN pip3 install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    python-multipart==0.0.6 \
    demucs==4.0.1 \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    numpy==1.24.3

# Copy service code
COPY demucs_service.py .

# Create output directory
RUN mkdir -p /tmp/demucs_output

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:8010/health')"

# Run service
CMD ["uvicorn", "demucs_service:app", "--host", "0.0.0.0", "--port", "8010"]
