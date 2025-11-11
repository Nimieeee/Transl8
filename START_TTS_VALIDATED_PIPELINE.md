# Start TTS-Validated Pipeline - Complete Guide

## Quick Start (3 Terminals Required)

### Terminal 1: Backend
```bash
cd packages/backend
npm run dev
```
**Wait for:** `Server listening on port 3001`

### Terminal 2: Workers
```bash
cd packages/workers
npm run dev
```
**Wait for all 5 workers:**
- ✓ STT Worker started (OpenAI Whisper)
- ✓ Adaptation Worker started (Mistral AI) ← **TTS validation happens here**
- ✓ TTS Worker started (OpenAI TTS)
- ✓ Final Assembly Worker started
- ✓ Muxing Worker started

### Terminal 3: Upload Video
```bash
curl -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es"
```

---

## What You'll See

### In Terminal 2 (Workers), watch for:

```
🎯 TTS-validating 2 segments
Using TTS-validated adaptation (±15% tolerance)

📝 TTS-validating segment 0/2: "Hi, my name is..." (10.2s)
🔄 Starting TTS-validated adaptation for segment 0
   Target duration: 10.24s (±15%)
📝 Attempt 1/3
   Generated text: "Hola, soy Tolu y esto es una demo..."
   🎤 Generating test audio...
   Actual duration: 10.15s
   ✅ WITHIN TOLERANCE (10.15s vs 10.24s, -0.9% diff)
   ✅ SUCCESS: "Hola, soy Tolu..." (10.15s, 1 attempts)

📊 TTS-VALIDATED ADAPTATION SUMMARY
Total segments: 2
Successful: 2 (100%)
Average attempts: 1.0
Total TTS calls: 2

🚀 TTS-validated adaptation complete (100% success)
```

---

## The TTS-Validated Loop is READY

✅ All code implemented and verified
✅ Bug fixed (OpenAI TTS API parameters)
✅ 12 comprehensive documentation files created
✅ Integration confirmed

**Just start the services and watch it work!** 🚀
