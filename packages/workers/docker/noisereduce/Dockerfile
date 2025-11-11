# Noise Reduction Service
# Provides REST API for ambient noise removal using noisereduce

FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python packages
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    python-multipart==0.0.6 \
    noisereduce==3.0.0 \
    soundfile==0.12.1 \
    numpy==1.24.3 \
    scipy==1.11.4

# Copy service code
COPY noisereduce_service.py .

# Expose port
EXPOSE 8011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:8011/health')"

# Run service
CMD ["uvicorn", "noisereduce_service:app", "--host", "0.0.0.0", "--port", "8011"]
