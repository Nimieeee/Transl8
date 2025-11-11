# 🎙️ Voice Cloning Setup Guide

Your dubbing platform now supports **voice cloning** - the output audio will match the speaker's voice from the input video!

## Current Configuration

### Pipeline:
1. **STT**: OpenAI Whisper (transcription)
2. **Translation**: OpenAI GPT-4o-mini (high quality)
3. **TTS**: YourTTS with voice cloning (matches original voice)

## Quick Setup

### Option 1: OpenAI Only (No Voice Cloning)

**Easiest setup, but output voice won't match input:**

```bash
cd packages/workers
cp .env.example .env
# Edit .env and add:
OPENAI_API_KEY=sk-your-key-here
```

**Result**: Real transcription + translation, but generic voice

### Option 2: OpenAI + YourTTS (With Voice Cloning) ⭐

**Best quality with voice matching:**

1. **Get OpenAI API Key**:
   ```bash
   # Get from: https://platform.openai.com/api-keys
   ```

2. **Start YourTTS Service**:
   ```bash
   cd packages/workers/docker/yourtts
   
   # With GPU (recommended)
   docker build -t yourtts-service .
   docker run --gpus all -p 8007:8007 yourtts-service
   
   # Or with CPU (slower)
   docker run -p 8007:8007 yourtts-service
   ```

3. **Configure Environment**:
   ```bash
   cd packages/workers
   cp .env.example .env
   # Edit .env:
   OPENAI_API_KEY=sk-your-key-here
   YOURTTS_SERVICE_URL=http://localhost:8007
   ```

4. **Restart Worker**:
   ```bash
   npm run dev
   ```

## How It Works

### Voice Cloning Process:

1. **Extract Audio**: Get audio from input video
2. **Transcribe**: OpenAI Whisper transcribes speech
3. **Translate**: OpenAI GPT translates to target language
4. **Clone Voice**: YourTTS analyzes original speaker's voice
5. **Generate**: YourTTS speaks translation in cloned voice
6. **Merge**: New audio replaces original in video

### Example:

**Input**: English video with John's voice  
**Output**: Spanish video with John's voice speaking Spanish! 🎉

## Service Comparison

### YourTTS (Recommended)
- **Voice Cloning**: ✅ Excellent
- **Quality**: Very good
- **Speed**: Fast (with GPU)
- **Cost**: Free (self-hosted)
- **Languages**: 16 languages
- **Setup**: Docker container

### XTTS (Alternative)
- **Voice Cloning**: ✅ Excellent
- **Quality**: Very good
- **Speed**: Fast (with GPU)
- **Cost**: Free (self-hosted)
- **Languages**: 17 languages
- **Setup**: Already in your docker folder

### OpenAI TTS (Fallback)
- **Voice Cloning**: ❌ No
- **Quality**: Excellent
- **Speed**: Very fast
- **Cost**: $0.015 per 1K chars
- **Languages**: 50+ languages
- **Setup**: Just API key

## Testing Voice Cloning

### 1. Start Services

```bash
# Terminal 1: Start YourTTS
cd packages/workers/docker/yourtts
docker run --gpus all -p 8007:8007 yourtts-service

# Terminal 2: Start Worker
cd packages/workers
npm run dev

# Terminal 3: Start Backend
cd packages/backend
npm run dev
```

### 2. Upload Video

```bash
curl -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en"
```

### 3. Check Logs

You should see:
```
Using OpenAI Whisper API for transcription
Transcribed: "Hello, this is a test..."

Using OpenAI GPT-4 for translation
Translated: "Hola, esto es una prueba..."

Using YourTTS with voice cloning
Speech generated using YourTTS with voice cloning
```

## Cost Estimation

### Per 5-minute video:
- **Whisper STT**: $0.03
- **GPT Translation**: $0.01
- **YourTTS**: $0.00 (self-hosted)
- **Total**: ~$0.04 per video

### Per month (100 videos):
- **Total**: ~$4/month

**Much cheaper than cloud voice cloning services!**

## Docker Compose Setup

Add to your `docker-compose.yml`:

```yaml
services:
  yourtts:
    build: ./packages/workers/docker/yourtts
    ports:
      - "8007:8007"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
```

Then start everything:

```bash
docker-compose up -d
```

## Troubleshooting

### "YourTTS failed" in logs

**Check if service is running:**
```bash
curl http://localhost:8007/health
```

**Should return:**
```json
{
  "status": "healthy",
  "model": "YourTTS",
  "version": "1.0.0"
}
```

### "No GPU detected"

YourTTS works on CPU but is slower. For production, use GPU:

```bash
# Check GPU
nvidia-smi

# Install nvidia-docker2
sudo apt-get install nvidia-docker2
sudo systemctl restart docker
```

### "Model download failed"

The model is large (~1GB). First run will download it:

```bash
docker logs -f <container-id>
# Wait for: "YourTTS model loaded successfully"
```

### Voice quality is poor

**Tips for better voice cloning:**
- Use clean audio (no background noise)
- Provide 5-10 seconds of speech
- Ensure good audio quality in input video
- Use WAV format at 22050 Hz or higher

## Advanced Configuration

### Use XTTS Instead

XTTS is an alternative to YourTTS with similar quality:

```bash
# Start XTTS service
cd packages/workers/docker/xtts
docker build -t xtts-service .
docker run --gpus all -p 8005:8005 xtts-service

# Update .env
XTTS_SERVICE_URL=http://localhost:8005
```

### Fallback Chain

The worker tries services in this order:
1. YourTTS (voice cloning)
2. XTTS (voice cloning)
3. OpenAI TTS (no cloning)
4. gTTS (no cloning)
5. Silent audio (last resort)

## Production Deployment

For production, deploy YourTTS on a GPU server:

```bash
# AWS EC2 with GPU (g4dn.xlarge)
# GCP with GPU (n1-standard-4 + T4)
# Azure with GPU (NC6)

# Install Docker + nvidia-docker2
# Deploy YourTTS container
# Point YOURTTS_SERVICE_URL to server
```

## Next Steps

1. ✅ Get OpenAI API key
2. ✅ Start YourTTS service
3. ✅ Configure .env
4. ✅ Test with real video
5. ✅ Enjoy voice-cloned dubbing! 🎉

**Your videos will now have the original speaker's voice in the target language!**
