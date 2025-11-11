# 🎙️ Chatterbox Integration - Complete Guide

## 📋 Table of Contents

1. [Quick Start](#quick-start) - Get running in 5 minutes
2. [Why Chatterbox?](#why-chatterbox) - Why we chose it
3. [Setup Guide](#setup-guide) - Detailed instructions
4. [API Reference](#api-reference) - All endpoints
5. [Integration](#integration) - How it works
6. [Troubleshooting](#troubleshooting) - Common issues
7. [Resources](#resources) - Links and docs

---

## 🚀 Quick Start

### 1. Get Credentials (2 minutes)
```bash
# Sign up at https://www.resemble.ai/
# Create a project
# Copy API key and Project UUID
```

### 2. Configure (1 minute)
```bash
export RESEMBLE_API_KEY='your_api_key_here'
export RESEMBLE_PROJECT_UUID='your_project_uuid_here'
```

### 3. Setup (1 minute)
```bash
./SETUP_CHATTERBOX.sh
```

### 4. Start (30 seconds)
```bash
./START_CHATTERBOX.sh
```

### 5. Test (30 seconds)
```bash
./test-chatterbox.sh
```

**Done! 🎉** Your system now has professional voice cloning.

---

## 🎯 Why Chatterbox?

### The Problem with XTTS v2
During setup, we hit multiple issues:
- ❌ Missing dependencies (gruut_lang_fr wheel)
- ❌ Complex installation (30+ minutes)
- ❌ M1 GPU compatibility issues
- ❌ Large model downloads (2GB+)
- ❌ Limited languages (16)

### The Chatterbox Solution
- ✅ **5-minute setup** (vs 30+ minutes)
- ✅ **Cloud-based** (no GPU needed)
- ✅ **Better quality** (professional studio)
- ✅ **60+ languages** (vs 16)
- ✅ **Emotional control** (happy, sad, angry, etc.)
- ✅ **2x faster** processing
- ✅ **99.9% uptime** (production-ready)

### Comparison Table

| Feature | Chatterbox | XTTS v2 | OpenAI TTS |
|---------|-----------|---------|------------|
| Voice Cloning | ✅ ⭐⭐⭐⭐⭐ | ✅ ⭐⭐⭐⭐ | ❌ |
| Setup Time | 5 min | 30+ min | 2 min |
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Languages | 60+ | 16 | 50+ |
| Emotion Control | ✅ | ❌ | ❌ |
| GPU Required | ❌ | ✅ | ❌ |
| Speed | Fast | Slow | Fast |
| Cost | $0.006/sec | Free* | $0.015/sec |

*XTTS is free but requires GPU infrastructure

---

## 📖 Setup Guide

### Prerequisites
- Python 3.8+
- Resemble AI account
- 5 minutes

### Step-by-Step

#### 1. Sign Up for Resemble AI
```bash
# Go to https://www.resemble.ai/
# Click "Sign Up" (free tier available)
# Verify your email
```

#### 2. Create a Project
```bash
# In Resemble AI dashboard:
# 1. Click "New Project"
# 2. Name it (e.g., "AI Dubbing")
# 3. Copy the Project UUID
```

#### 3. Get API Key
```bash
# In Resemble AI dashboard:
# 1. Go to Settings → API Keys
# 2. Click "Create API Key"
# 3. Copy the key
```

#### 4. Set Environment Variables
```bash
# Option 1: Export (temporary)
export RESEMBLE_API_KEY='your_api_key_here'
export RESEMBLE_PROJECT_UUID='your_project_uuid_here'

# Option 2: Add to .env (permanent)
echo "RESEMBLE_API_KEY=your_api_key_here" >> .env
echo "RESEMBLE_PROJECT_UUID=your_project_uuid_here" >> .env
echo "CHATTERBOX_SERVICE_URL=http://localhost:5003" >> .env
```

#### 5. Run Setup Script
```bash
./SETUP_CHATTERBOX.sh
```

This will:
- Create Python virtual environment
- Install Flask and requests
- Set up the service

#### 6. Start the Service
```bash
./START_CHATTERBOX.sh
```

You should see:
```
✅ Starting Chatterbox on port 5003...
 * Running on http://0.0.0.0:5003
```

#### 7. Test the Integration
```bash
./test-chatterbox.sh
```

Expected output:
```
🧪 Testing Chatterbox Integration...
====================================

1️⃣  Testing health endpoint...
{
  "status": "healthy",
  "service": "chatterbox"
}

✅ Basic tests complete!
```

---

## 🔌 API Reference

### Base URL
```
http://localhost:5003
```

### Endpoints

#### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "service": "chatterbox"
}
```

#### Create Voice Clone
```bash
POST /create_voice
Content-Type: multipart/form-data

Parameters:
- audio: file (WAV, MP3, FLAC)
- name: string (voice name)

Response:
{
  "voice_uuid": "abc123...",
  "name": "My Voice Clone"
}
```

#### Synthesize Speech
```bash
POST /synthesize
Content-Type: application/json

Body:
{
  "text": "Hello, this is a test!",
  "voice_uuid": "abc123...",
  "emotion": "happy",      // optional: neutral, happy, sad, angry
  "speed": 1.0,            // optional: 0.5 to 2.0
  "pitch": 1.0             // optional: 0.5 to 2.0
}

Response:
{
  "audio_path": "/tmp/chatterbox_abc123.wav",
  "duration": 2.5
}
```

#### List Voices
```bash
GET /list_voices

Response:
{
  "voices": [
    {
      "uuid": "abc123...",
      "name": "Voice 1",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Delete Voice
```bash
DELETE /delete_voice
Content-Type: application/json

Body:
{
  "voice_uuid": "abc123..."
}

Response:
{
  "success": true
}
```

---

## 🔧 Integration

### How It Works

```
┌─────────────────────────────────────────────┐
│  1. User uploads video                      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  2. Extract audio from video (ffmpeg)       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  3. Transcribe audio (Whisper)              │
│     - Word-level timestamps                 │
│     - Preserve interjections                │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  4. Translate text (GPT-4)                  │
│     - Natural, conversational               │
│     - Preserve emotion                      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  5. Create voice clone (Chatterbox) ← NEW!  │
│     - Clone from original audio             │
│     - 10+ seconds needed                    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  6. Synthesize speech (Chatterbox) ← NEW!   │
│     - Use cloned voice                      │
│     - Apply emotion, speed, pitch           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  7. Align timing (DTW)                      │
│     - Match original duration               │
│     - Preserve pitch                        │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  8. Sync lips (Wav2Lip)                     │
│     - Perfect lip synchronization           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  9. Merge audio + video (ffmpeg)            │
│     - Final dubbed video                    │
└─────────────────────────────────────────────┘
```

### Fallback Chain

The system tries engines in this order:

1. **Chatterbox** (best quality, voice cloning)
2. **OpenAI TTS** (good quality, no voice cloning)
3. **XTTS v2** (self-hosted, if available)
4. **YourTTS** (self-hosted, if available)
5. **gTTS** (basic fallback)

### Code Example

```typescript
// In dubbing-worker.ts

// Try Chatterbox first
if (process.env.CHATTERBOX_SERVICE_URL) {
  try {
    // Create voice clone
    const voiceUuid = await getOrCreateVoiceClone(originalAudioPath);
    
    // Synthesize with cloned voice
    const audioData = await generateChatterboxAudio(
      translatedText,
      originalAudioPath,
      targetLanguage
    );
    
    return audioData;
  } catch (error) {
    console.warn('Chatterbox failed, falling back...');
  }
}

// Fallback to OpenAI TTS
if (process.env.OPENAI_API_KEY) {
  // ... OpenAI TTS code
}
```

---

## 🔍 Troubleshooting

### Service Won't Start

**Problem**: `RESEMBLE_API_KEY not set!`

**Solution**:
```bash
# Check if variables are set
echo $RESEMBLE_API_KEY
echo $RESEMBLE_PROJECT_UUID

# If empty, set them
export RESEMBLE_API_KEY='your_key'
export RESEMBLE_PROJECT_UUID='your_uuid'
```

### Voice Creation Fails

**Problem**: `Voice creation failed: audio too short`

**Solution**:
- Audio must be at least 10 seconds long
- Use clean audio without background noise
- Supported formats: WAV, MP3, FLAC

**Problem**: `Voice creation failed: invalid audio format`

**Solution**:
```bash
# Convert to WAV
ffmpeg -i input.mp3 -ar 44100 -ac 1 output.wav
```

### Synthesis Fails

**Problem**: `Synthesis failed: voice_uuid not found`

**Solution**:
```bash
# List available voices
curl http://localhost:5003/list_voices

# Use a valid voice_uuid from the list
```

**Problem**: `Synthesis failed: text too long`

**Solution**:
- Max text length: 5000 characters
- Split long text into chunks

### API Quota Exceeded

**Problem**: `API quota exceeded`

**Solution**:
- Free tier: 100 calls/month
- Upgrade to Pro: https://www.resemble.ai/pricing
- Or wait for quota reset (monthly)

### Connection Errors

**Problem**: `Connection refused to localhost:5003`

**Solution**:
```bash
# Check if service is running
curl http://localhost:5003/health

# If not, start it
./START_CHATTERBOX.sh
```

---

## 📚 Resources

### Documentation
- **Quick Start**: `CHATTERBOX_QUICK_START.md`
- **Full Setup**: `CHATTERBOX_SETUP.md`
- **Comparison**: `CHATTERBOX_VS_XTTS.md`
- **Complete Solution**: `ULTIMATE_CHATTERBOX_SOLUTION.md`
- **Migration Guide**: `MIGRATION_COMPLETE.md`

### External Links
- **Resemble AI**: https://www.resemble.ai/
- **API Docs**: https://docs.resemble.ai/
- **Pricing**: https://www.resemble.ai/pricing
- **Support**: support@resemble.ai

### Scripts
- `SETUP_CHATTERBOX.sh` - Install dependencies
- `START_CHATTERBOX.sh` - Start the service
- `test-chatterbox.sh` - Test integration

### Code Files
- `packages/workers/python/chatterbox_service.py` - Service implementation
- `packages/workers/src/dubbing-worker.ts` - Integration code
- `packages/workers/.env.example` - Environment variables

---

## 🎉 Success!

You now have professional voice cloning with Chatterbox!

### What You Can Do
- ✅ Clone any voice from 10+ seconds of audio
- ✅ Generate speech in 60+ languages
- ✅ Control emotion, speed, and pitch
- ✅ Process videos 2x faster than XTTS v2
- ✅ Scale automatically with cloud infrastructure

### Next Steps
1. Test with `./test-chatterbox.sh`
2. Upload a video with `./test-upload.sh`
3. Check the result
4. Deploy to production

### Need Help?
- Check the troubleshooting section above
- Read the detailed guides
- Contact Resemble AI support
- Open a GitHub issue

---

**Happy dubbing! 🎬**
