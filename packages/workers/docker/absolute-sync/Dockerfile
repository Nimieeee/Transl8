# Absolute Synchronization Assembly Service
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy service files
COPY absolute_sync_assembler.py .
COPY absolute_sync_service.py .
COPY context_map_service.py .

# Create temp directory
RUN mkdir -p /app/temp

# Expose port
EXPOSE 8012

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8012

# Run service
CMD ["python", "absolute_sync_service.py"]

