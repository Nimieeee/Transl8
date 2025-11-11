# Quick Start Guide - Get Everything Working

## Current Status

Based on your system, here's what we need to do:

### ✅ What's Already Working
- Backend API (Port 3001)
- Demucs Vocal Isolation (Port 5003)

### ❌ What Needs to Start
- Whisper STT (Port 5001)
- Pyannote Diarization (Port 5002)
- Noisereduce (Port 5004)
- Emotion Analysis (Port 5007)
- OpenVoice TTS (Port 5008)

## Option 1: Quick Fix - Install Missing Dependencies

Run this command to install all Python dependencies:

```bash
pip3 install fastapi uvicorn torch transformers librosa soundfile pydub noisereduce pyannote.audio openai-whisper demucs flask requests numpy scipy
```

Then start each service manually:

```bash
# Terminal 1: Whisper
cd packages/workers/docker/whisper && python3 whisper_service.py

# Terminal 2: Pyannote  
cd packages/workers/docker/pyannote && python3 pyannote_service.py

# Terminal 3: Noisereduce
cd packages/workers/docker/noisereduce && python3 noisereduce_service.py

# Terminal 4: Emotion
cd packages/workers/docker/emotion && python3 emotion_service.py

# Terminal 5: OpenVoice
cd packages/workers/docker/openvoice && python3 openvoice_service.py
```

## Option 2: Use Docker (Recommended for Production)

If you have Docker installed:

```bash
docker-compose up -d
```

This will start all services in containers.

## Option 3: Simplified Test (No AI Services)

If you just want to test the integration tests without running the full pipeline:

```bash
cd packages/backend
npm test -- robust-pipeline
```

This runs the database-level integration tests that don't require AI services.

## What I Recommend Right Now

Since you want everything working, let's do this step by step:

### Step 1: Install Python Dependencies

```bash
pip3 install --upgrade pip
pip3 install fastapi uvicorn torch transformers librosa soundfile pydub noisereduce flask requests numpy scipy
```

### Step 2: Start Services One by One

I'll create individual start scripts for each service...
