# 🚀 Start AI Dubbing - Quick Guide

## ✅ What's Ready

Your AI dubbing platform is configured with:

- **OpenAI Whisper** - Speech-to-text transcription
- **OpenAI GPT-4o-mini** - Professional translation  
- **YourTTS** - Voice cloning (optional)
- **Multiple fallbacks** - Always works

## 🎯 Get Started in 3 Steps

### Step 1: Add OpenAI API Key

```bash
# Get your key from: https://platform.openai.com/api-keys

# Edit the config file
nano packages/workers/.env

# Change this line:
OPENAI_API_KEY=your_openai_api_key_here

# To your actual key:
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 2: Test the System

```bash
# Run the test script
./test-ai-dubbing.sh

# Should show:
# ✅ Backend running
# ✅ Worker running
# ✅ OpenAI API key configured
```

### Step 3: Upload a Video

```bash
# Use the test script
./test-upload.sh

# Or manually:
curl -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en"
```

## 📊 What Happens

```
Your Video (English)
    ↓
Whisper transcribes → "Hello, this is a test..."
    ↓
GPT translates → "Hola, esto es una prueba..."
    ↓
TTS generates → Spanish audio
    ↓
FFmpeg merges → Dubbed video!
```

## 💰 Cost

- **Per video (5 min)**: ~$0.09
- **Per month (100 videos)**: ~$9

## 🎙️ Want Voice Cloning?

To make the output voice match the input voice:

```bash
# Start YourTTS service
cd packages/workers/docker/yourtts
docker build -t yourtts-service .
docker run -p 8007:8007 yourtts-service

# Enable in config
nano packages/workers/.env
# Uncomment: YOURTTS_SERVICE_URL=http://localhost:8007
```

**Cost drops to $0.04 per video + voice matches original!**

## 🐛 Troubleshooting

### Services not running?

```bash
# Check status
./test-ai-dubbing.sh

# Start missing services:
redis-server                    # Redis
brew services start postgresql  # PostgreSQL
cd packages/backend && npm run dev  # Backend
cd packages/workers && npx tsx watch src/dubbing-only.ts  # Worker
```

### API key not working?

```bash
# Test your key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Should return list of models
# If error, key is invalid
```

### No audio in output?

Check worker logs for:
- "Using OpenAI Whisper API" ✅
- "Using OpenAI GPT-4" ✅
- "Using OpenAI TTS" ✅

If you see "mock" or "failed", check your API key.

## 📚 Documentation

- **Quick Start**: `OPENAI_YOURTTS_SETUP.md`
- **Voice Cloning**: `VOICE_CLONING_SETUP.md`
- **Complete Guide**: `AI_DUBBING_COMPLETE.md`

## 🎉 You're Ready!

1. Add OpenAI API key ← **Do this now**
2. Run `./test-upload.sh`
3. Watch the magic happen! ✨

**Questions?** Check the docs above or run `./test-ai-dubbing.sh` to diagnose issues.
