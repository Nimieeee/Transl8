# Running the Complete AI Video Dubbing System

This guide will help you get the entire robust AI video dubbing pipeline up and running.

## Prerequisites

Before starting, ensure you have:

1. **Python 3.9+** installed
2. **Node.js 18+** and npm installed
3. **PostgreSQL 15+** installed and running
4. **Redis** installed and running
5. **FFmpeg** installed (`brew install ffmpeg` on macOS)
6. **Git** installed

## Quick Start (Recommended)

### 1. Stop Any Running Services

```bash
./stop-all-services.sh
```

### 2. Start Everything

```bash
./setup-and-start-all.sh
```

This script will:
- Install all Python dependencies
- Check and start PostgreSQL and Redis
- Run database migrations
- Start the Backend API
- Start all AI services (Whisper, Pyannote, Demucs, Noisereduce, Emotion, OpenVoice)
- Start the Workers
- Verify all services are running

### 3. Check Service Status

```bash
./check-services-status.sh
```

### 4. Run the System Test

```bash
python3 test-robust-pipeline.py
```

This will test the complete pipeline with a real video file.

## Manual Setup (Alternative)

If the automated script doesn't work, follow these steps:

### 1. Install Python Dependencies

```bash
# For each service
pip3 install -r packages/workers/docker/whisper/requirements.txt
pip3 install -r packages/workers/docker/pyannote/requirements.txt
pip3 install -r packages/workers/docker/demucs/requirements.txt
pip3 install -r packages/workers/docker/noisereduce/requirements.txt
pip3 install -r packages/workers/docker/emotion/requirements.txt
pip3 install -r packages/workers/docker/openvoice/requirements.txt
```

### 2. Start PostgreSQL and Redis

```bash
# PostgreSQL
brew services start postgresql@15

# Redis
brew services start redis
```

### 3. Setup Database

```bash
cd packages/backend
createdb dubbing_platform
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 4. Start Backend API

```bash
cd packages/backend
npm install
npm run dev &
cd ../..
```

### 5. Start AI Services

Open separate terminal windows for each:

```bash
# Terminal 1: Whisper STT
cd packages/workers/docker/whisper
python3 whisper_service.py

# Terminal 2: Pyannote Diarization
cd packages/workers/docker/pyannote
python3 pyannote_service.py

# Terminal 3: Demucs Vocal Isolation
cd packages/workers/docker/demucs
python3 demucs_service.py

# Terminal 4: Noisereduce
cd packages/workers/docker/noisereduce
python3 noisereduce_service.py

# Terminal 5: Emotion Analysis
cd packages/workers/docker/emotion
python3 emotion_service.py

# Terminal 6: OpenVoice TTS
cd packages/workers/docker/openvoice
python3 openvoice_service.py
```

### 6. Start Workers

```bash
cd packages/workers
npm install
npm run dev &
cd ../..
```

## Service Ports

| Service | Port | Health Check |
|---------|------|--------------|
| Backend API | 3001 | http://localhost:3001/health |
| Whisper STT | 5001 | http://localhost:5001/health |
| Pyannote Diarization | 5002 | http://localhost:5002/health |
| Demucs Vocal Isolation | 5003 | http://localhost:5003/health |
| Noisereduce | 5004 | http://localhost:5004/health |
| Emotion Analysis | 5007 | http://localhost:5007/health |
| OpenVoice TTS | 5008 | http://localhost:5008/health |

## Testing the System

### Run Complete Pipeline Test

```bash
python3 test-robust-pipeline.py
```

This will:
1. Check if the video file exists
2. Verify all services are running
3. Create a dubbing job
4. Monitor progress through all pipeline stages
5. Verify Context Map integrity
6. Check output files
7. Validate quality metrics

### Run Integration Tests

```bash
cd packages/backend
npm test -- robust-pipeline
```

This runs the comprehensive integration test suite covering:
- End-to-end pipeline flow
- Vocal isolation quality
- Adaptation engine edge cases
- Absolute synchronization accuracy
- Context Map integrity

## Troubleshooting

### Services Won't Start

1. **Check logs**: All logs are in `/tmp/*.log`
   ```bash
   tail -f /tmp/whisper.log
   tail -f /tmp/backend.log
   ```

2. **Check ports**: Make sure ports aren't already in use
   ```bash
   lsof -i :3001  # Backend
   lsof -i :5001  # Whisper
   ```

3. **Kill stuck processes**:
   ```bash
   ./stop-all-services.sh
   ```

### Missing Dependencies

If you get "Module not found" errors:

```bash
# Python dependencies
pip3 install fastapi uvicorn torch transformers librosa soundfile

# Node dependencies
cd packages/backend && npm install
cd packages/workers && npm install
```

### Database Issues

```bash
# Reset database
dropdb dubbing_platform
createdb dubbing_platform
cd packages/backend
npx prisma migrate deploy
```

### GPU/CUDA Issues

If you don't have a GPU, the services will fall back to CPU mode. This is slower but will work.

To force CPU mode, set in each service:
```python
device = "cpu"
```

## Stopping Services

```bash
./stop-all-services.sh
```

This will stop all running services and clean up PID files.

## Log Files

All service logs are stored in `/tmp/`:
- `/tmp/backend.log` - Backend API logs
- `/tmp/workers.log` - Workers logs
- `/tmp/whisper.log` - Whisper STT logs
- `/tmp/pyannote.log` - Pyannote logs
- `/tmp/demucs.log` - Demucs logs
- `/tmp/noisereduce.log` - Noisereduce logs
- `/tmp/emotion.log` - Emotion analysis logs
- `/tmp/openvoice.log` - OpenVoice TTS logs

## Next Steps

Once everything is running:

1. **Test with your video**: Place your video in the root directory and update `test-robust-pipeline.py`
2. **Monitor the pipeline**: Watch the logs to see each stage complete
3. **Check quality metrics**: Review the Context Map and quality metrics after completion
4. **Iterate**: Adjust parameters and retry as needed

## Support

If you encounter issues:
1. Check the logs in `/tmp/`
2. Run `./check-services-status.sh` to see which services are down
3. Review the error messages in the test output
4. Ensure all prerequisites are installed

## Architecture Overview

The robust pipeline includes:
- **STT**: Whisper + Pyannote for transcription and speaker diarization
- **Vocal Isolation**: Demucs for music removal + Noisereduce for cleanup
- **Emotion Analysis**: Wav2Vec2 for emotion detection
- **Adaptation**: Gemini-powered intelligent translation with timing constraints
- **TTS**: OpenVoice for zero-shot voice cloning with emotion
- **Synchronization**: Absolute sync assembly for perfect timing
- **Context Map**: Centralized state management across all stages

Enjoy dubbing! 🎬🎙️
