# 🎤 How Whisper is Used - Complete Guide

## Overview

Your system uses **OpenAI Whisper** for speech-to-text transcription. It runs as a **self-hosted service** (not OpenAI's API), giving you full control and no per-request costs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WHISPER SETUP                             │
└─────────────────────────────────────────────────────────────┘

Audio File → STT Worker → Whisper Adapter → Whisper Service (Docker)
                                                    ↓
                                            Whisper Model (large-v3)
                                                    ↓
                                            Transcript + Timestamps
```

## Three Components

### 1. **Whisper Service** (Docker Container)
**File**: `packages/workers/docker/whisper/whisper_service.py`

A Python FastAPI service that:
- Loads the Whisper model on startup
- Exposes REST API endpoints
- Processes audio files
- Returns transcripts with word-level timestamps

**Key Features**:
```python
# Loads Whisper large-v3 model
model = whisper.load_model("large-v3")

# Transcribes with word timestamps
result = model.transcribe(
    audio_file,
    language="en",
    word_timestamps=True
)
```

**API Endpoints**:
- `POST /transcribe` - Transcribe audio file
- `GET /health` - Health check
- `GET /` - Service info

### 2. **Whisper Adapter** (TypeScript)
**File**: `packages/backend/src/adapters/whisper-pyannote-adapter.ts`

A TypeScript adapter that:
- Sends audio files to Whisper service
- Combines with speaker diarization (pyannote)
- Formats results for your application
- Handles errors and retries

**Key Methods**:
```typescript
class WhisperPyannoteAdapter {
  // Main transcription method
  async transcribe(audioPath: string, language: string): Promise<STTResult>
  
  // Calls Whisper service
  private async runWhisperTranscription(audioPath, language)
  
  // Aligns speakers with transcript
  private alignSpeakerLabels(whisperSegments, diarization)
  
  // Health check
  async healthCheck(): Promise<HealthCheckResult>
}
```

### 3. **STT Worker** (Background Job Processor)
**File**: `packages/workers/src/stt-worker.ts`

A BullMQ worker that:
- Processes transcription jobs from queue
- Downloads audio files
- Calls Whisper adapter
- Stores results in database
- Triggers next pipeline step

## How It Works

### Step-by-Step Flow

```
1. User uploads video
   ↓
2. Backend extracts audio (FFmpeg)
   ↓
3. Audio uploaded to storage
   ↓
4. STT job added to queue
   ↓
5. STT Worker picks up job
   ↓
6. Worker downloads audio file
   ↓
7. Worker calls Whisper Adapter
   ↓
8. Adapter sends audio to Whisper Service
   ↓
9. Whisper Service transcribes audio
   ↓
10. Results returned to Adapter
   ↓
11. Adapter combines with speaker info
   ↓
12. Worker stores transcript in database
   ↓
13. Next step: Translation
```

### Detailed API Call

**Request to Whisper Service**:
```typescript
// From whisper-pyannote-adapter.ts
const formData = new FormData();
formData.append('audio', fs.createReadStream(audioPath));
formData.append('language', 'en');
formData.append('model', 'large-v3');
formData.append('word_timestamps', 'true');

const response = await axios.post(
  'http://localhost:8001/transcribe',
  formData,
  {
    headers: formData.getHeaders(),
    timeout: 600000, // 10 minutes
  }
);
```

**Response from Whisper Service**:
```json
{
  "text": "Hello, this is a test transcription.",
  "language": "en",
  "duration": 5.2,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 2.5,
      "text": "Hello, this is a test",
      "confidence": 0.95,
      "words": [
        {
          "word": "Hello",
          "start": 0.0,
          "end": 0.5,
          "probability": 0.98
        },
        {
          "word": "this",
          "start": 0.6,
          "end": 0.8,
          "probability": 0.96
        }
      ]
    }
  ]
}
```

## Whisper Model Details

### Model: large-v3

**Specifications**:
- **Size**: ~3GB
- **Parameters**: 1.5 billion
- **Languages**: 99 languages
- **Accuracy**: State-of-the-art
- **Speed**: ~1x realtime on GPU, ~5x on CPU

**Why large-v3?**
- Best accuracy
- Supports 99 languages
- Word-level timestamps
- Low hallucination rate
- Good with accents and noise

### Other Available Models

You can change the model in the service:

```python
# In whisper_service.py
MODEL_NAME = "large-v3"  # Best quality
# MODEL_NAME = "medium"  # Faster, good quality
# MODEL_NAME = "small"   # Fast, decent quality
# MODEL_NAME = "base"    # Very fast, basic quality
```

## Configuration

### Environment Variables

```bash
# Whisper service URL
WHISPER_SERVICE_URL=http://localhost:8001

# Pyannote service URL (for speaker diarization)
PYANNOTE_SERVICE_URL=http://localhost:8002

# Worker concurrency
WORKER_CONCURRENCY=2
```

### Docker Setup

**Dockerfile**: `packages/workers/docker/whisper/Dockerfile`

```dockerfile
FROM python:3.10-slim

# Install dependencies
RUN pip install openai-whisper fastapi uvicorn python-multipart

# Copy service
COPY whisper_service.py /app/

# Expose port
EXPOSE 8001

# Run service
CMD ["python", "/app/whisper_service.py"]
```

**Start Service**:
```bash
cd packages/workers/docker/whisper
docker build -t whisper-service .
docker run -p 8001:8001 whisper-service
```

## Features

### 1. **Word-Level Timestamps**
```json
{
  "words": [
    {"word": "Hello", "start": 0.0, "end": 0.5, "probability": 0.98},
    {"word": "world", "start": 0.6, "end": 1.0, "probability": 0.97}
  ]
}
```

### 2. **Confidence Scores**
- Per-word probability
- Per-segment average log probability
- Overall confidence calculation

### 3. **Multi-Language Support**
```typescript
// Supports 99 languages
await adapter.transcribe(audioPath, 'en');  // English
await adapter.transcribe(audioPath, 'es');  // Spanish
await adapter.transcribe(audioPath, 'fr');  // French
await adapter.transcribe(audioPath, 'zh');  // Chinese
```

### 4. **Speaker Diarization**
Combined with pyannote.audio to identify speakers:
```json
{
  "segments": [
    {
      "text": "Hello",
      "speaker": "SPEAKER_00",
      "start": 0.0,
      "end": 2.0
    },
    {
      "text": "Hi there",
      "speaker": "SPEAKER_01",
      "start": 2.1,
      "end": 4.0
    }
  ]
}
```

### 5. **Quality Warnings**
```typescript
warnings: [
  "Low average confidence (65%). Audio quality may be poor.",
  "3 segment(s) have low confidence and may need review."
]
```

## No OpenAI API Required!

### Self-Hosted vs OpenAI API

**Your Setup (Self-Hosted)**:
- ✅ No API costs
- ✅ No rate limits
- ✅ Full control
- ✅ Privacy (data stays on your servers)
- ✅ Customizable
- ❌ Requires GPU for speed
- ❌ Need to manage infrastructure

**OpenAI API**:
- ✅ No infrastructure needed
- ✅ Always up-to-date
- ❌ Costs per minute ($0.006/min)
- ❌ Rate limits
- ❌ Data sent to OpenAI
- ❌ Less customizable

## Performance

### Speed
- **With GPU**: ~1x realtime (5 min audio = 5 min processing)
- **With CPU**: ~5x realtime (5 min audio = 25 min processing)

### Accuracy
- **Clean audio**: 95-99% accuracy
- **Noisy audio**: 80-90% accuracy
- **Multiple speakers**: 85-95% accuracy

### Resource Usage
- **RAM**: 4-8GB
- **GPU VRAM**: 4GB+ (recommended)
- **Disk**: 3GB for model

## Testing Whisper

### 1. Test Service Directly

```bash
# Check health
curl http://localhost:8001/health

# Transcribe audio file
curl -X POST http://localhost:8001/transcribe \
  -F "audio=@test.wav" \
  -F "language=en" \
  -F "model=large-v3" \
  -F "word_timestamps=true"
```

### 2. Test via Adapter

```typescript
import { WhisperPyannoteAdapter } from './adapters/whisper-pyannote-adapter';

const adapter = new WhisperPyannoteAdapter();
const result = await adapter.transcribe('audio.wav', 'en');

console.log(result.transcript.text);
console.log(result.transcript.segments);
```

### 3. Test Full Pipeline

Upload a video through the frontend and watch the logs:
```bash
# Watch STT worker logs
tail -f logs/stt-worker.log

# Watch Whisper service logs
docker logs -f whisper-service
```

## Troubleshooting

### Service Not Starting
```bash
# Check if port is in use
lsof -i :8001

# Check Docker logs
docker logs whisper-service

# Restart service
docker restart whisper-service
```

### Low Accuracy
- Check audio quality (16kHz, mono recommended)
- Verify correct language code
- Try different Whisper model
- Check for background noise

### Slow Processing
- Use GPU if available
- Reduce model size (medium instead of large-v3)
- Increase worker concurrency
- Process shorter segments

### Out of Memory
- Reduce model size
- Process shorter audio files
- Increase Docker memory limit
- Use CPU instead of GPU

## Alternative: OpenAI API

If you want to use OpenAI's API instead:

```typescript
// Install OpenAI SDK
npm install openai

// Use OpenAI API
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream('audio.mp3'),
  model: 'whisper-1',
  language: 'en',
  response_format: 'verbose_json',
  timestamp_granularities: ['word']
});
```

**Costs**: $0.006 per minute of audio

## Summary

**How Whisper is Used**:
1. ✅ **Self-hosted** Docker service (not OpenAI API)
2. ✅ **Whisper large-v3** model for best accuracy
3. ✅ **REST API** for easy integration
4. ✅ **Word-level timestamps** for precise alignment
5. ✅ **Speaker diarization** via pyannote
6. ✅ **99 languages** supported
7. ✅ **No API costs** - runs on your infrastructure

**Files to Check**:
- Service: `packages/workers/docker/whisper/whisper_service.py`
- Adapter: `packages/backend/src/adapters/whisper-pyannote-adapter.ts`
- Worker: `packages/workers/src/stt-worker.ts`
- Dockerfile: `packages/workers/docker/whisper/Dockerfile`
