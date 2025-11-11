# Emotion Analysis Service - Wav2Vec2-based Speech Emotion Recognition
# Requirements: 17.1, 17.2

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    torch==2.0.1 \
    torchaudio==2.0.2 \
    transformers==4.35.0 \
    librosa==0.10.1 \
    numpy==1.24.3 \
    flask==3.0.0 \
    soundfile==0.12.1

# Copy service code
COPY emotion_service.py .

# Expose port
EXPOSE 8010

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODEL_NAME=superb/wav2vec2-base-superb-er
ENV DEVICE=cpu
ENV PORT=8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8010/health')"

# Run service
CMD ["python", "emotion_service.py"]
