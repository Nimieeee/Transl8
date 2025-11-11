# 🎭 Emotion Service - Quick Start

## TL;DR

```bash
# Start service
./start-emotion-service.sh

# Test it
python3 test-emotion-service.py

# Use it
curl http://localhost:8010/health
```

---

## What It Is

- **Real** emotion detection using `superb/wav2vec2-base-superb-er`
- **No mocks** - 100% production-ready
- **Port:** 8010
- **Emotions:** neutral, happy, sad, angry

---

## Commands

### Start
```bash
./start-emotion-service.sh
```

### Test
```bash
python3 test-emotion-service.py
```

### Verify
```bash
./verify-emotion-service.sh
```

### Health Check
```bash
curl http://localhost:8010/health
```

### Analyze Audio
```bash
curl -X POST http://localhost:8010/analyze \
  -H "Content-Type: application/json" \
  -d '{"audio_path": "/path/to/audio.wav"}'
```

---

## Status

✅ **READY TO USE**
- No setup required
- Model auto-downloads
- Fast CPU inference
- Production ready

---

## Files

- `packages/workers/docker/emotion/emotion_service.py` - Service
- `packages/backend/src/adapters/emotion-adapter.ts` - Adapter
- `start-emotion-service.sh` - Start script
- `test-emotion-service.py` - Test script

---

## More Info

See `EMOTION_SERVICE_COMPLETE.md` for full documentation.
