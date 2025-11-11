# Docker Services Setup Guide

## Overview

Your system is configured to use **API-based services** (OpenAI Whisper, Gemini) by default, which means you **don't need most Docker services** for basic operation.

However, if you want to run local AI models, this guide explains how to set up the optional Docker services.

---

## Current Status

### ✅ Running Services (Required)
```bash
docker-compose ps
```

Currently running:
- ✅ **postgres** - Database (port 5432)
- ✅ **redis** - Queue/cache (port 6379)

### ⚠️ Optional Services (Not Running)

These services are **optional** and only needed if you want to use local models instead of APIs:

| Service | Purpose | Port | GPU Required | Status |
|---------|---------|------|--------------|--------|
| emotion | Emotion analysis | 5007 | Yes | Not running |
| openvoice | Text-to-speech | 8085 | Yes | Not running |
| whisper | Speech-to-text | 8001 | Yes | Not running (using OpenAI API) |
| pyannote | Speaker diarization | 8002 | Yes | Not running (using OpenAI API) |
| marian | Translation | 8080 | No | Not running (using Gemini API) |
| styletts | TTS | 8082 | Yes | Not running |
| xtts | Voice cloning | 8083 | Yes | Not running |
| wav2lip | Lip sync | 8084 | Yes | Not running |

---

## Why You Don't Need These Services

### Current Configuration (API-Based) ✅

Your system is configured to use:
- **OpenAI Whisper API** for speech-to-text (no local service needed)
- **Gemini API** for translation (no local service needed)
- **No TTS yet** (can add later)

This means you can run the complete dubbing pipeline **without any GPU-heavy Docker services**!

---

## When You Might Want Docker Services

### Use Case 1: Multi-Speaker Content
**Problem**: OpenAI Whisper doesn't support speaker diarization
**Solution**: Use local Whisper + Pyannote services

```bash
# Set in packages/backend/.env
USE_OPENAI_WHISPER=false

# Start services
docker-compose up -d whisper pyannote
```

### Use Case 2: Emotion-Aware Dubbing
**Problem**: Need emotion detection for expressive dubbing
**Solution**: Use emotion analysis service

```bash
docker-compose up -d emotion
```

### Use Case 3: Voice Cloning TTS
**Problem**: Need to clone voices for dubbing
**Solution**: Use OpenVoice or XTTS service

```bash
docker-compose up -d openvoice
# or
docker-compose up -d xtts
```

---

## Setting Up Optional Services

### Prerequisites

**1. GPU Required**
Most services need NVIDIA GPU with CUDA support:
```bash
# Check if you have NVIDIA GPU
nvidia-smi
```

If you don't have a GPU, these services won't work. Stick with API-based services.

**2. Hugging Face Token (for some services)**
Some services need a Hugging Face token:

1. Create account: https://huggingface.co/
2. Get token: https://huggingface.co/settings/tokens
3. Add to `.env`:
   ```bash
   HF_TOKEN=hf_your_token_here
   ```

---

## Starting Individual Services

### Emotion Analysis Service

**Purpose**: Detect emotions in speech for expressive dubbing

```bash
# Start service
docker-compose up -d emotion

# Check logs
docker-compose logs -f emotion

# Test health
curl http://localhost:5007/health
```

**First run**: Downloads ~1.2GB model from Hugging Face

---

### OpenVoice TTS Service

**Purpose**: Zero-shot voice cloning for dubbing

**⚠️ Note**: OpenVoice models need to be downloaded from Hugging Face

```bash
# Start service
docker-compose up -d openvoice

# Check logs
docker-compose logs -f openvoice

# Test health
curl http://localhost:8085/health
```

**First run**: Downloads models from Hugging Face (may take time)

**If it fails**:
1. Check you have GPU: `nvidia-smi`
2. Check logs: `docker-compose logs openvoice`
3. Models may need manual download

---

### Whisper + Pyannote (Local STT with Diarization)

**Purpose**: Speech-to-text with speaker identification

```bash
# Update .env
echo "USE_OPENAI_WHISPER=false" >> packages/backend/.env

# Start services
docker-compose up -d whisper pyannote

# Check logs
docker-compose logs -f whisper
docker-compose logs -f pyannote
```

**First run**: Downloads large models (~3GB for Whisper)

---

## Troubleshooting

### Error: "no such service: demucs"

**Cause**: The service name in docker-compose.yml is different

**Available services**:
```bash
# List all services
docker-compose config --services
```

Output:
- postgres
- redis
- minio
- backend
- frontend
- workers
- whisper
- pyannote
- marian
- styletts
- xtts
- wav2lip
- segment-dubbing
- emotion
- openvoice

**Note**: There is no "demucs" service. Vocal isolation is handled differently.

---

### Error: "HF_TOKEN variable is not set"

**Cause**: Some services need Hugging Face token

**Solution**:
```bash
# Add to root .env file
echo "HF_TOKEN=hf_your_token_here" >> .env

# Or export temporarily
export HF_TOKEN=hf_your_token_here
docker-compose up -d pyannote
```

---

### Error: "GPU not available"

**Cause**: Services require NVIDIA GPU

**Solutions**:
1. **Use API-based services** (recommended)
   - Keep using OpenAI Whisper
   - Keep using Gemini
   - No GPU needed!

2. **Run on CPU** (very slow)
   - Edit docker-compose.yml
   - Remove GPU requirements
   - Change DEVICE=cpu in environment

3. **Use cloud GPU**
   - Deploy to AWS/GCP with GPU instances
   - See k8s/ directory for Kubernetes configs

---

### Service Won't Start

**Check logs**:
```bash
docker-compose logs <service-name>
```

**Common issues**:
1. **Out of memory**: Services need lots of RAM
2. **Model download failed**: Check internet connection
3. **Port already in use**: Another service using the port
4. **GPU not available**: Need NVIDIA GPU

---

## Recommended Setup

### For Development (No GPU)

```bash
# Only start required services
docker-compose up -d postgres redis

# Use API-based services
# - OpenAI Whisper for STT ✅
# - Gemini for translation ✅
# - No TTS yet (add later)
```

### For Production (With GPU)

```bash
# Start core services
docker-compose up -d postgres redis

# Start AI services as needed
docker-compose up -d emotion openvoice

# Or start all services
docker-compose up -d
```

---

## Service Health Checks

### Check All Running Services
```bash
docker-compose ps
```

### Check Specific Service
```bash
# Health endpoint
curl http://localhost:5007/health  # emotion
curl http://localhost:8085/health  # openvoice
curl http://localhost:8001/health  # whisper
curl http://localhost:8002/health  # pyannote
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f emotion
docker-compose logs -f openvoice
```

---

## Stopping Services

### Stop All Services
```bash
docker-compose down
```

### Stop Specific Service
```bash
docker-compose stop emotion
docker-compose stop openvoice
```

### Remove Volumes (Clean Slate)
```bash
docker-compose down -v
```

---

## Summary

### ✅ What You Need Right Now

**Minimum setup** (already running):
```bash
docker-compose up -d postgres redis
```

**Your application** (3 terminals):
```bash
# Terminal 1: Backend
cd packages/backend && npm run dev

# Terminal 2: Workers
cd packages/workers && npm run dev

# Terminal 3: Frontend
cd packages/frontend && npm run dev
```

### ⚠️ What You DON'T Need

You **don't need** these Docker services because you're using APIs:
- ❌ whisper (using OpenAI Whisper API)
- ❌ pyannote (OpenAI doesn't do diarization)
- ❌ marian (using Gemini API)
- ❌ emotion (optional feature)
- ❌ openvoice (optional feature)
- ❌ xtts (optional feature)
- ❌ styletts (optional feature)
- ❌ wav2lip (optional feature)

### 🎯 When to Add Services

Add services only when you need specific features:
- **Multi-speaker content** → Add whisper + pyannote
- **Emotion detection** → Add emotion
- **Voice cloning** → Add openvoice or xtts
- **Lip sync** → Add wav2lip

---

## Quick Reference

### Start Core Services Only
```bash
docker-compose up -d postgres redis
```

### Start With Emotion Analysis
```bash
docker-compose up -d postgres redis emotion
```

### Start With Voice Cloning
```bash
docker-compose up -d postgres redis openvoice
```

### Start Everything (Requires GPU)
```bash
docker-compose up -d
```

### Check What's Running
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f
```

### Stop Everything
```bash
docker-compose down
```

---

## Next Steps

1. ✅ Keep using postgres + redis (already running)
2. ✅ Keep using OpenAI Whisper API (no Docker service needed)
3. ✅ Keep using Gemini API (no Docker service needed)
4. 🎬 Start your application services (backend, workers, frontend)
5. 📊 Test with a video upload
6. 🔧 Add optional Docker services only if you need specific features

Your system is ready to use **without any GPU-heavy Docker services**! 🚀
