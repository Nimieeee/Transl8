# CLI Pipeline Limitations

## Issue Identified

The `run-pipeline-cli.sh` script has significant limitations:

### Problems

1. **Mock Translations** ❌
   - Uses hardcoded "Hola, ¿cómo estás hoy?" for ALL videos
   - Same 2 segments regardless of input
   - No real translation happening

2. **No Real Transcription** ❌
   - Creates mock transcript instead of calling Whisper
   - Hardcoded text: "Hello, how are you today?"
   - Ignores actual video content

3. **Short Output** ❌
   - Only processes 2 hardcoded segments
   - 22-second video → 2-second output
   - Missing most of the content

4. **No Segmentation** ❌
   - Whisper returns 1 segment for short videos
   - Need sentence-level segmentation
   - No timing synchronization

5. **No Real Translation** ❌
   - Doesn't call Gemini for translation
   - Just passes English text to Spanish TTS
   - No context-aware adaptation

## Why This Happens

The CLI script (`run-pipeline-cli.sh`) is a **simplified demo/test script** that:
- Was designed to test individual services
- Uses mock data for quick testing
- Doesn't implement the full pipeline logic
- Skips complex steps like segmentation and translation

## Real Solution

### Use the Full Backend API

The proper implementation exists in the backend:

```
packages/backend/src/
├── lib/
│   ├── context-map.ts          # Proper segmentation
│   ├── adaptation-engine.ts    # Real translation
│   ├── adaptation-service.ts   # Context-aware adaptation
│   └── gemini-client.ts        # Gemini API integration
├── adapters/
│   ├── openai-whisper-adapter.ts  # Real transcription
│   └── openvoice-adapter.ts       # Voice synthesis
└── routes/
    └── projects.ts             # Full pipeline orchestration
```

### What the Backend Does

1. **Real Transcription**
   - Calls OpenAI Whisper API
   - Gets word-level timestamps
   - Proper language detection

2. **Context Map**
   - Sentence-level segmentation
   - Timing analysis
   - Context extraction

3. **Adaptation Engine**
   - Real translation with Gemini 2.5 Pro
   - Context-aware adaptation
   - Cultural localization
   - Timing constraints

4. **Voice Synthesis**
   - Segment-by-segment synthesis
   - Emotion preservation
   - Proper timing

5. **Final Assembly**
   - Synchronization
   - Audio mixing
   - Video assembly

## Quick Fix Options

### Option 1: Use the Frontend (Recommended)

```bash
# Start the full system
cd packages/backend && npm run dev &
cd packages/frontend && npm run dev &

# Open browser
open http://localhost:3000

# Upload video through UI
```

### Option 2: Use the Backend API Directly

```bash
# Start backend
cd packages/backend && npm run dev

# Call API
curl -X POST http://localhost:3001/api/projects \
  -F "video=@movie-11-6-25.mov" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=es"
```

### Option 3: Create Proper CLI (Complex)

Would need to:
1. Call OpenAI Whisper API for real transcription
2. Implement sentence segmentation
3. Call Gemini API for each segment translation
4. Handle timing and synchronization
5. Synthesize each segment with proper timing
6. Assemble final video with sync

This is essentially rebuilding the backend logic in bash, which is not practical.

## Current CLI Script Purpose

The `run-pipeline-cli.sh` is useful for:
- ✅ Testing individual services (Demucs, Noisereduce, Emotion, OpenVoice)
- ✅ Verifying services are running
- ✅ Quick smoke tests
- ❌ NOT for real video dubbing

## Recommendation

**Use the full backend + frontend system for real video dubbing.**

The CLI script is just for testing services, not for production dubbing.

---

## Test Results

### What Works in CLI
- ✅ Service health checks
- ✅ Audio extraction
- ✅ Vocal isolation (Demucs)
- ✅ Noise reduction (Noisereduce)
- ✅ Emotion analysis (real)
- ✅ Voice synthesis (OpenVoice)

### What Doesn't Work in CLI
- ❌ Real transcription (uses mock)
- ❌ Real translation (uses mock)
- ❌ Proper segmentation
- ❌ Timing synchronization
- ❌ Full video dubbing

---

## Next Steps

1. **For Testing Services:** Use `run-pipeline-cli.sh` ✅
2. **For Real Dubbing:** Use the full backend/frontend system
3. **For Production:** Deploy the complete application

The services are all working perfectly. The issue is just that the CLI script is a simplified test tool, not the real pipeline.
