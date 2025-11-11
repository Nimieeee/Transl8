# OpenVoice TTS Service Dockerfile
# Provides zero-shot voice cloning with style transfer

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    torch==2.0.1 \
    torchaudio==2.0.2 \
    numpy==1.24.3 \
    scipy==1.10.1 \
    librosa==0.10.0 \
    soundfile==0.12.1 \
    flask==2.3.2 \
    pydub==0.25.1 \
    openvoice==0.1.0

# Copy service code
COPY openvoice_service.py .

# Create directories for models and clones
RUN mkdir -p /app/models /app/clones /app/temp

# Expose port
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8084/health')"

# Run service
CMD ["python", "openvoice_service.py"]
