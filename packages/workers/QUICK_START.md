# STT Worker Quick Start

Get the STT worker running in 5 minutes.

## Prerequisites

- Docker with GPU support
- HuggingFace account and token
- NVIDIA GPU (16GB+ VRAM)

## Quick Setup

### 1. Set HuggingFace Token

```bash
# Add to .env file in project root
echo "HF_TOKEN=your_token_here" >> .env
```

Get token from: https://huggingface.co/settings/tokens

Accept license: https://huggingface.co/pyannote/speaker-diarization-3.1

### 2. Install Dependencies

```bash
# Backend
cd packages/backend
npm install

# Workers
cd ../workers
npm install
```

### 3. Start Services

```bash
# From project root
docker-compose up -d postgres redis whisper pyannote

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

### 4. Start Worker

```bash
# Option A: With Docker
docker-compose up -d workers

# Option B: Locally (for development)
cd packages/workers
npm run dev
```

### 5. Verify

```bash
# Check Whisper
curl http://localhost:8001/health
# Expected: {"status":"healthy","model":"large-v3"}

# Check Pyannote
curl http://localhost:8002/health
# Expected: {"status":"healthy","model":"pyannote-3.1"}

# Check worker logs
docker-compose logs -f workers
# Expected: "STT worker started successfully"
```

## Test Processing

### Upload a Video

```bash
# 1. Register/login to get JWT token
TOKEN="your_jwt_token"

# 2. Create project
PROJECT_ID=$(curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","sourceLanguage":"en","targetLanguage":"es"}' \
  | jq -r '.project.id')

# 3. Upload video
curl -X POST http://localhost:3001/api/projects/$PROJECT_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test-video.mp4"

# 4. Check status
curl http://localhost:3001/api/projects/$PROJECT_ID/status \
  -H "Authorization: Bearer $TOKEN"

# 5. Get quality metrics (after STT completes)
curl http://localhost:3001/api/projects/$PROJECT_ID/transcript/quality \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Services Won't Start

```bash
# Check GPU
nvidia-smi

# Check Docker GPU support
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# View service logs
docker-compose logs whisper
docker-compose logs pyannote
```

### Worker Errors

```bash
# Check worker logs
docker-compose logs -f workers

# Restart worker
docker-compose restart workers

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### Low Quality Transcripts

- Check audio quality of source video
- Verify correct source language
- Review confidence scores in quality metrics
- Consider using smaller test videos first

## Common Commands

```bash
# View all logs
docker-compose logs -f

# Restart services
docker-compose restart whisper pyannote workers

# Stop all services
docker-compose down

# Clean up and restart
docker-compose down -v
docker-compose up -d
```

## Next Steps

1. Review `STT_WORKER.md` for detailed documentation
2. Check `SETUP.md` for comprehensive setup guide
3. Implement MT worker (Task 10)
4. Build transcript editor UI (Task 16.6)

## Support

For issues:
1. Check logs: `docker-compose logs [service]`
2. Verify GPU: `nvidia-smi`
3. Check health endpoints
4. Review `SETUP.md` troubleshooting section
