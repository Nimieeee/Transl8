# Services Status

## ✅ Emotion Analysis Service - READY

**Status:** Production Ready  
**Model:** `superb/wav2vec2-base-superb-er` (HuggingFace)  
**Port:** 8010  
**Emotions:** neutral, happy, sad, angry

### Quick Start
```bash
./start-emotion-service.sh
```

### Features
- Real emotion detection using wav2vec2
- Fast inference on CPU
- Batch processing support
- Health check endpoint
- Automatic model download from HuggingFace

### API Endpoints

**Health Check:**
```bash
curl http://localhost:8010/health
```

**Analyze Single Audio:**
```bash
curl -X POST http://localhost:8010/analyze \
  -H "Content-Type: application/json" \
  -d '{"audio_path": "/path/to/audio.wav"}'
```

**Batch Analysis:**
```bash
curl -X POST http://localhost:8010/analyze_batch \
  -H "Content-Type: application/json" \
  -d '{"audio_paths": ["/path/1.wav", "/path/2.wav"]}'
```

### Test
```bash
python3 test-emotion-service.py
```

---

## 📦 OpenVoice Service - SETUP REQUIRED

**Status:** Needs Installation  
**Port:** 8007  
**Type:** Voice Cloning TTS

### Setup Required
OpenVoice requires manual installation and model checkpoints.

**Automated Setup:**
```bash
./setup-openvoice.sh
```

**Manual Setup:**
See `SETUP_MISSING_SERVICES.md` for detailed instructions.

### Why Setup is Needed
- OpenVoice is not a pip package
- Requires cloning from GitHub
- Needs model checkpoint downloads (~500MB)
- Requires conda environment

---

## ✅ Other Services - READY

### Demucs (Port 8008)
- Vocal isolation
- Ready to use
- Started by `./start-pipeline-services.sh`

### Noisereduce (Port 8009)
- Noise reduction
- Ready to use
- Started by `./start-pipeline-services.sh`

---

## Quick Commands

**Start All Services:**
```bash
./start-pipeline-services.sh
```

**Check Service Status:**
```bash
curl http://localhost:8010/health  # Emotion
curl http://localhost:8007/health  # OpenVoice
curl http://localhost:8008/health  # Demucs
curl http://localhost:8009/health  # Noisereduce
```

**View Logs:**
```bash
tail -f /tmp/emotion.log
tail -f /tmp/openvoice.log
tail -f /tmp/demucs.log
tail -f /tmp/noisereduce.log
```

**Stop Services:**
```bash
./stop-pipeline-services.sh
```

---

## Next Steps

1. ✅ Emotion service is ready - no action needed
2. 📦 Setup OpenVoice if you need voice cloning:
   ```bash
   ./setup-openvoice.sh
   ```
3. 🚀 Test the full pipeline:
   ```bash
   ./run-pipeline-cli.sh test-video.mov
   ```
