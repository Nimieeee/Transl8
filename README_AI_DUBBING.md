# 🎬 AI Video Dubbing Platform

Professional video dubbing with **OpenAI Whisper**, **GPT-4o-mini**, and **YourTTS voice cloning**.

## 🚀 Quick Start (3 Steps)

### 1. Add OpenAI API Key

```bash
nano packages/workers/.env
# Set: OPENAI_API_KEY=sk-proj-xxxxx
```

Get your key: https://platform.openai.com/api-keys

### 2. Test System

```bash
./test-ai-dubbing.sh
```

### 3. Upload Video

```bash
./test-full-ai-pipeline.sh
```

**That's it!** Your video will be dubbed with real AI.

## 💡 What It Does

```
Input: English video with John's voice
    ↓
Whisper: Transcribes speech
    ↓
GPT: Translates to Spanish
    ↓
YourTTS: Generates Spanish audio in John's voice
    ↓
Output: Spanish video with John's voice!
```

## 💰 Cost

- **Per video (5 min)**: $0.04 - $0.09
- **Per month (100 videos)**: $4 - $9

## 🎙️ Voice Cloning (Optional)

Make output voice match input speaker:

```bash
# Start YourTTS
cd packages/workers/docker/yourtts
docker build -t yourtts-service .
docker run -p 8007:8007 yourtts-service

# Enable in config
nano packages/workers/.env
# Uncomment: YOURTTS_SERVICE_URL=http://localhost:8007
```

## 📚 Documentation

- **Quick Start**: `START_AI_DUBBING.md`
- **Setup Guide**: `OPENAI_YOURTTS_SETUP.md`
- **Voice Cloning**: `VOICE_CLONING_SETUP.md`
- **Complete Guide**: `AI_DUBBING_COMPLETE.md`
- **This Summary**: `AI_SETUP_COMPLETE.md`

## 🧪 Test Scripts

```bash
./test-ai-dubbing.sh          # Check system status
./test-full-ai-pipeline.sh    # Test full pipeline
./test-upload.sh              # Simple upload test
```

## ✨ Features

- ✅ Real transcription (OpenAI Whisper)
- ✅ Professional translation (GPT-4o-mini)
- ✅ Voice cloning (YourTTS)
- ✅ Multiple fallbacks
- ✅ Cost effective
- ✅ Production ready

## 🎯 Services

| Service | Purpose | Quality | Cost |
|---------|---------|---------|------|
| **OpenAI Whisper** | Transcription | Excellent | $0.006/min |
| **OpenAI GPT-4o-mini** | Translation | Excellent | $0.002/1K tokens |
| **YourTTS** | Voice Cloning TTS | Very Good | Free (self-hosted) |
| **OpenAI TTS** | Fallback TTS | Excellent | $0.015/1K chars |
| **gTTS** | Final Fallback | Good | Free |

## 🐛 Troubleshooting

### No audio in output?

```bash
# Check OpenAI key
grep OPENAI_API_KEY packages/workers/.env

# Should show: OPENAI_API_KEY=sk-proj-xxxxx
```

### Services not running?

```bash
./test-ai-dubbing.sh
# Shows status of all services
```

### Need help?

Check the detailed guides in the Documentation section above.

## 🎉 Ready to Go!

Your platform is configured and ready. Just:

1. Add your OpenAI API key
2. Run `./test-full-ai-pipeline.sh`
3. Start dubbing! 🚀

---

**Cost**: ~$0.04 per video | **Quality**: Professional | **Setup**: 5 minutes
