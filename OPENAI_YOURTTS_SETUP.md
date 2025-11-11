# 🚀 OpenAI + YourTTS Setup Guide

Your dubbing platform is now configured to use:
- **OpenAI Whisper** for transcription
- **OpenAI GPT-4o-mini** for translation
- **YourTTS** for voice cloning TTS

## Quick Start (2 Options)

### Option 1: OpenAI Only (Fastest Setup)

**No voice cloning, but works immediately:**

```bash
cd packages/workers

# Edit .env and add your OpenAI API key:
nano .env
# Change: OPENAI_API_KEY=your_openai_api_key_here
# To: OPENAI_API_KEY=sk-proj-xxxxx

# Restart worker (already running)
```

**Get OpenAI API Key**: https://platform.openai.com/api-keys

**Result**:
- ✅ Real transcription (Whisper)
- ✅ Real translation (GPT-4o-mini)
- ⚠️ Generic voice (no cloning)

### Option 2: OpenAI + YourTTS (Best Quality)

**With voice cloning - output matches input voice:**

```bash
# Step 1: Start YourTTS service
cd packages/workers/docker/yourtts

# Build Docker image (one-time, ~5 minutes)
docker build -t yourtts-service .

# Run with GPU (recommended)
docker run --gpus all -p 8007:8007 yourtts-service

# Or run with CPU (slower but works)
docker run -p 8007:8007 yourtts-service

# Step 2: Configure environment
cd ../../
nano .env

# Add OpenAI key and uncomment YourTTS:
OPENAI_API_KEY=sk-proj-xxxxx
YOURTTS_SERVICE_URL=http://localhost:8007

# Worker will auto-reload
```

**Result**:
- ✅ Real transcription (Whisper)
- ✅ Real translation (GPT-4o-mini)
- ✅ Voice cloning (YourTTS)

## Test the Setup

### 1. Check Services

```bash
# Check YourTTS (if using Option 2)
curl http://localhost:8007/health

# Should return:
# {"status":"healthy","model":"YourTTS","version":"1.0.0"}
```

### 2. Upload Test Video

```bash
curl -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en"

# Returns: {"jobId":"xxx","status":"pending",...}
```

### 3. Monitor Progress

```bash
# Watch worker logs
# You should see:
# - "Using OpenAI Whisper API for transcription"
# - "Using OpenAI GPT-4 for translation"
# - "Using YourTTS with voice cloning" (if Option 2)
```

## Expected Logs

### With OpenAI Only:
```
Transcribing audio for job xxx
Using OpenAI Whisper API for transcription
Transcribed: "Hello, this is a test..."

Translating text for job xxx
Using OpenAI GPT-4 for translation
Translated: "Hola, esto es una prueba..."

Generating speech for job xxx
Using OpenAI TTS (no voice cloning)
Speech generated using OpenAI TTS
```

### With OpenAI + YourTTS:
```
Transcribing audio for job xxx
Using OpenAI Whisper API for transcription
Transcribed: "Hello, this is a test..."

Translating text for job xxx
Using OpenAI GPT-4 for translation
Translated: "Hola, esto es una prueba..."

Generating speech with voice cloning for job xxx
Using YourTTS with voice cloning
Speech generated using YourTTS with voice cloning
```

## Cost Comparison

### Option 1 (OpenAI Only):
**Per 5-minute video:**
- Whisper STT: $0.03
- GPT Translation: $0.01
- OpenAI TTS: $0.05
- **Total: ~$0.09**

**Per month (100 videos): ~$9**

### Option 2 (OpenAI + YourTTS):
**Per 5-minute video:**
- Whisper STT: $0.03
- GPT Translation: $0.01
- YourTTS: $0.00 (self-hosted)
- **Total: ~$0.04**

**Per month (100 videos): ~$4**

**Savings: 55% cheaper + voice cloning!**

## Troubleshooting

### "No OpenAI API key" in logs

1. Check `.env` file exists: `ls packages/workers/.env`
2. Check key is set: `grep OPENAI_API_KEY packages/workers/.env`
3. Verify key format: Should start with `sk-proj-` or `sk-`
4. Test key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_KEY"
   ```

### "YourTTS failed" in logs

1. Check service is running:
   ```bash
   curl http://localhost:8007/health
   ```

2. Check Docker container:
   ```bash
   docker ps | grep yourtts
   docker logs <container-id>
   ```

3. Restart service:
   ```bash
   docker stop <container-id>
   docker run --gpus all -p 8007:8007 yourtts-service
   ```

### Worker not picking up changes

The worker uses `tsx watch` and should auto-reload. If not:

```bash
# Stop worker (Ctrl+C in terminal)
# Or kill process:
pkill -f "tsx watch"

# Restart:
cd packages/workers
npx tsx watch src/dubbing-worker.ts
```

### GPU not detected for YourTTS

YourTTS works on CPU but is slower. To use GPU:

```bash
# Check GPU
nvidia-smi

# Install nvidia-docker2
sudo apt-get install nvidia-docker2
sudo systemctl restart docker

# Run with GPU
docker run --gpus all -p 8007:8007 yourtts-service
```

## What's Next?

### Current Status:
✅ Worker updated with OpenAI + YourTTS support  
✅ YourTTS Docker service created  
✅ Environment configured  
✅ Ready to test  

### To Get Started:

1. **Add OpenAI API key** to `packages/workers/.env`
2. **(Optional) Start YourTTS** for voice cloning
3. **Upload a video** and watch the magic! 🎉

### Files Created:
- `packages/workers/src/dubbing-worker.ts` - Updated with voice cloning
- `packages/workers/docker/yourtts/` - YourTTS service
- `packages/workers/.env.example` - Configuration template
- `VOICE_CLONING_SETUP.md` - Detailed setup guide
- `OPENAI_YOURTTS_SETUP.md` - This file

**Your platform now supports professional-grade AI dubbing with voice cloning!** 🚀
