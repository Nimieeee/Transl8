# STT Worker Setup Guide

Quick guide to get the STT worker and model services running.

## Prerequisites

1. **Docker with GPU support** (nvidia-docker2)
2. **HuggingFace account** for pyannote.audio access
3. **NVIDIA GPU** with CUDA support (16GB+ VRAM recommended)

## Step 1: Get HuggingFace Token

1. Create account at https://huggingface.co
2. Go to Settings → Access Tokens
3. Create a new token with read access
4. Accept the pyannote.audio model license at:
   - https://huggingface.co/pyannote/speaker-diarization-3.1

## Step 2: Configure Environment

Create `.env` file in project root:

```bash
# HuggingFace token for pyannote
HF_TOKEN=your_token_here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform

# Redis
REDIS_URL=redis://localhost:6379

# Worker settings
WORKER_CONCURRENCY=2

# Model service URLs (for local development)
WHISPER_SERVICE_URL=http://localhost:8001
PYANNOTE_SERVICE_URL=http://localhost:8002
```

## Step 3: Install Dependencies

```bash
# Install backend dependencies (includes adapters)
cd packages/backend
npm install

# Install worker dependencies
cd ../workers
npm install
```

## Step 4: Start Services with Docker Compose

### Option A: Full Stack (Recommended)

```bash
# Start all services including model services
docker-compose up -d

# View logs
docker-compose logs -f whisper pyannote workers
```

### Option B: Services Only (for development)

```bash
# Start only infrastructure services
docker-compose up -d postgres redis minio

# Start model services separately
docker-compose up -d whisper pyannote

# Run workers locally
cd packages/workers
npm run dev
```

## Step 5: Verify Services

### Check Whisper Service

```bash
curl http://localhost:8001/health
# Expected: {"status":"healthy","model":"large-v3"}
```

### Check Pyannote Service

```bash
curl http://localhost:8002/health
# Expected: {"status":"healthy","model":"pyannote-3.1"}
```

### Check Worker Status

```bash
# View worker logs
docker-compose logs -f workers

# Or if running locally
# Check console output for "STT worker started successfully"
```

## Step 6: Test STT Processing

### 1. Upload a Video

```bash
# Create a project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'

# Upload video (replace PROJECT_ID)
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@test-video.mp4"
```

### 2. Monitor Processing

```bash
# Check project status
curl http://localhost:3001/api/projects/PROJECT_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check transcript quality (after STT completes)
curl http://localhost:3001/api/projects/PROJECT_ID/transcript/quality \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Whisper Service Won't Start

**Problem:** Container exits immediately

**Solutions:**
1. Check GPU availability: `nvidia-smi`
2. Verify nvidia-docker2 is installed
3. Check Docker GPU support: `docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi`
4. Review logs: `docker-compose logs whisper`

### Pyannote Service Fails

**Problem:** "Authentication required" or "Model not found"

**Solutions:**
1. Verify HF_TOKEN is set correctly
2. Accept model license at HuggingFace
3. Check token has read permissions
4. Review logs: `docker-compose logs pyannote`

### Worker Can't Connect to Services

**Problem:** "Connection refused" or "Service unavailable"

**Solutions:**
1. Verify services are running: `docker-compose ps`
2. Check service health endpoints
3. Verify network connectivity between containers
4. Check environment variables in worker

### Out of Memory Errors

**Problem:** CUDA out of memory

**Solutions:**
1. Reduce WORKER_CONCURRENCY to 1
2. Use smaller Whisper model (medium or small)
3. Increase GPU memory
4. Process shorter videos first

### Low Transcription Quality

**Problem:** Poor confidence scores or incorrect transcription

**Solutions:**
1. Check audio quality of source video
2. Verify correct source language is specified
3. Try different Whisper model size
4. Review audio extraction settings

## Development Tips

### Running Services Locally (without Docker)

#### Whisper Service

```bash
cd packages/workers/docker/whisper

# Install dependencies
pip install -r requirements.txt

# Run service
python whisper_service.py
```

#### Pyannote Service

```bash
cd packages/workers/docker/pyannote

# Install dependencies
pip install -r requirements.txt

# Set HuggingFace token
export HF_TOKEN=your_token_here

# Run service
python pyannote_service.py
```

#### Workers

```bash
cd packages/workers

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dubbing_platform
export REDIS_URL=redis://localhost:6379
export WHISPER_SERVICE_URL=http://localhost:8001
export PYANNOTE_SERVICE_URL=http://localhost:8002

# Run in development mode
npm run dev
```

### Testing Individual Components

#### Test Adapter

```typescript
import { WhisperPyannoteAdapter } from './adapters/whisper-pyannote-adapter';

const adapter = new WhisperPyannoteAdapter();

// Health check
const health = await adapter.healthCheck();
console.log('Health:', health);

// Transcribe
const result = await adapter.transcribe('./test-audio.wav', 'en');
console.log('Transcript:', result.transcript);
console.log('Metadata:', result.metadata);
```

#### Test Worker

```bash
# Add a test job to the queue
cd packages/backend
npm run dev

# In another terminal, start worker
cd packages/workers
npm run dev

# Monitor job processing in worker logs
```

## Performance Tuning

### GPU Memory Optimization

```yaml
# In docker-compose.yml, limit GPU memory per service
whisper:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
      limits:
        memory: 8G  # Limit container memory
```

### Worker Concurrency

```bash
# Adjust based on GPU memory
# 16GB GPU: WORKER_CONCURRENCY=2
# 24GB GPU: WORKER_CONCURRENCY=3
# 40GB+ GPU: WORKER_CONCURRENCY=4
```

### Model Selection

```typescript
// Use smaller model for faster processing
const adapter = new WhisperPyannoteAdapter(
  'http://localhost:8001',
  'http://localhost:8002',
  'medium'  // or 'small', 'base'
);
```

## Production Deployment

### Kubernetes

See `packages/workers/k8s/` for Kubernetes manifests (to be created in task 18).

### Scaling

- Deploy multiple worker instances
- Use separate GPU nodes for each model service
- Implement horizontal pod autoscaling based on queue depth
- Use spot instances for cost optimization

### Monitoring

- Set up Prometheus metrics for job processing
- Monitor GPU utilization with nvidia-smi
- Track confidence score distributions
- Alert on high error rates

## Next Steps

After STT worker is running:

1. Implement MT worker (Task 10)
2. Implement TTS worker (Task 11)
3. Implement lip-sync worker (Task 12)
4. Build frontend transcript editor (Task 16.6)
5. Set up production infrastructure (Task 18)
