# 🎬 AI Video Dubbing Platform - START HERE

## 🚀 Quick Start (3 Steps)

### 1️⃣ Install Dependencies

**Quick way:**
```bash
./install-all-dependencies.sh
```

**Or manually:**
```bash
pip3 install fastapi uvicorn python-multipart torch transformers librosa soundfile pydub noisereduce flask requests numpy scipy openai-whisper pyannote.audio demucs
```

### 2️⃣ Start All Services (5 Terminal Windows)

Open 5 terminal windows and run one command in each:

```bash
# Terminal 1
./start-whisper.sh

# Terminal 2
./start-pyannote.sh

# Terminal 3
./start-noisereduce.sh

# Terminal 4
./start-emotion.sh

# Terminal 5
./start-openvoice.sh
```

### 3️⃣ Test the System
```bash
# Check all services are running
./check-services-status.sh

# Run complete pipeline test
python3 test-robust-pipeline.py
```

## 📋 What You Get

A complete AI video dubbing pipeline with:
- ✅ Speech-to-text with speaker diarization
- ✅ Vocal isolation (removes music)
- ✅ Emotion detection
- ✅ Intelligent translation with timing constraints
- ✅ Voice cloning with emotion preservation
- ✅ Perfect audio synchronization
- ✅ Context Map for state management
- ✅ Quality metrics and monitoring

## 📚 Documentation

- **[COMPLETE_STARTUP_GUIDE.md](COMPLETE_STARTUP_GUIDE.md)** - Detailed startup instructions
- **[RUNNING_THE_SYSTEM.md](RUNNING_THE_SYSTEM.md)** - Full system documentation
- **[ROBUST_PIPELINE_TESTS_COMPLETE.md](ROBUST_PIPELINE_TESTS_COMPLETE.md)** - Test documentation

## 🛠️ Useful Commands

```bash
# Check service status
./check-services-status.sh

# Stop all services
./stop-all-services.sh

# Run integration tests
cd packages/backend && npm test -- robust-pipeline

# View logs
tail -f /tmp/whisper.log
tail -f /tmp/backend.log
```

## 🎯 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3001 | http://localhost:3001 |
| Whisper STT | 5001 | http://localhost:5001 |
| Pyannote | 5002 | http://localhost:5002 |
| Demucs | 5003 | http://localhost:5003 |
| Noisereduce | 5004 | http://localhost:5004 |
| Emotion | 5007 | http://localhost:5007 |
| OpenVoice | 5008 | http://localhost:5008 |

## ⚡ Quick Troubleshooting

**Services won't start?**
- Check `/tmp/*.log` files for errors
- Install missing dependencies: `pip3 install <package>`

**Port already in use?**
- Kill process: `lsof -ti :PORT | xargs kill`

**Out of memory?**
- Close other applications
- Services need ~8GB RAM minimum

## 🎓 Architecture

```
Video Input
    ↓
STT (Whisper + Pyannote) → Transcription + Speaker IDs
    ↓
Vocal Isolation (Demucs + Noisereduce) → Clean Audio
    ↓
Emotion Analysis → Emotion Tags
    ↓
Intelligent Adaptation (Gemini) → Timing-Aware Translation
    ↓
TTS (OpenVoice) → Voice Cloning with Emotion
    ↓
Absolute Synchronization → Perfect Timing
    ↓
Video Muxing → Final Dubbed Video
```

## 📊 Test Results

All 13 integration tests passing ✅
- End-to-end pipeline flow
- Vocal isolation quality
- Adaptation engine edge cases
- Absolute synchronization accuracy
- Context Map integrity

## 🎉 You're Ready!

Follow the 3 steps above and you'll have a complete AI video dubbing system running in minutes.

For detailed instructions, see [COMPLETE_STARTUP_GUIDE.md](COMPLETE_STARTUP_GUIDE.md)

Happy dubbing! 🎬🎙️
