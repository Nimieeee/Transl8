# 🌍 Translation Pipeline Explained

## What Translates the Audio?

The audio translation happens in **Step 3** of the dubbing pipeline. Here's the complete flow:

## Complete Dubbing Pipeline

```
Video Upload → Extract Audio → Transcribe → TRANSLATE → Generate Speech → Merge Audio
     ↓              ↓              ↓            ↓            ↓              ↓
   Upload      FFmpeg         Whisper      Marian MT      XTTS         FFmpeg
```

## Step-by-Step Process

### 1. **Video Upload** 
- User uploads video (MP4, MOV, MKV, or AVI)
- File stored in `uploads/` directory
- Job created in database

### 2. **Extract Audio** (Progress: 0-20%)
- **Tool**: FFmpeg
- **What it does**: Extracts audio track from video
- **Output**: WAV file (16kHz, mono)
- **File**: `packages/workers/src/dubbing-worker.ts` → `extractAudio()`

### 3. **Transcribe Audio** (Progress: 20-40%)
- **Tool**: Whisper AI (OpenAI)
- **What it does**: Converts speech to text
- **Output**: Text transcript with timestamps
- **Adapter**: `packages/backend/src/adapters/whisper-pyannote-adapter.ts`
- **Worker**: `packages/workers/src/stt-worker.ts`

### 4. **TRANSLATE TEXT** (Progress: 40-60%) ⭐
- **Tool**: Marian NMT (Neural Machine Translation)
- **What it does**: Translates text from source to target language
- **Model**: Helsinki-NLP Marian models
- **Features**:
  - Batch translation for efficiency
  - Preserves timestamps and speaker info
  - Supports custom glossaries
  - Fast neural translation
- **Adapter**: `packages/backend/src/adapters/marian-mt-adapter.ts`
- **Worker**: `packages/workers/src/mt-worker.ts`
- **Service**: Docker container running Marian NMT

### 5. **Generate Speech** (Progress: 60-80%)
- **Tool**: XTTS (Coqui TTS)
- **What it does**: Converts translated text to speech
- **Output**: Audio file in target language
- **Adapter**: `packages/backend/src/adapters/xtts-adapter.ts`
- **Worker**: `packages/workers/src/tts-worker.ts`

### 6. **Merge Audio** (Progress: 80-100%)
- **Tool**: FFmpeg
- **What it does**: Replaces original audio with dubbed audio
- **Output**: Final dubbed video (MP4)
- **File**: `packages/workers/src/dubbing-worker.ts` → `mergeAudioVideo()`

## Translation Component Details

### Marian NMT Adapter

**Location**: `packages/backend/src/adapters/marian-mt-adapter.ts`

**Key Features**:
```typescript
class MarianMTAdapter {
  // Translate single text
  async translate(text, sourceLanguage, targetLanguage, glossary?)
  
  // Translate transcript segments (preserves timing)
  async translateSegments(segments, sourceLanguage, targetLanguage, glossary?)
  
  // Batch translation for efficiency
  private async translateBatch(texts[], sourceLanguage, targetLanguage)
}
```

**How it works**:
1. Receives text segments with timestamps
2. Applies custom glossary terms (if provided)
3. Sends batch requests to Marian service
4. Receives translations
5. Restores glossary terms
6. Returns translated segments with preserved metadata

### MT Worker

**Location**: `packages/workers/src/mt-worker.ts`

**Process**:
1. Fetches approved transcript from database
2. Loads user's custom glossary (if enabled)
3. Extracts text segments
4. Calls Marian adapter to translate
5. Stores translation in database
6. Updates project status to "REVIEW"

### Marian Service

**Location**: `packages/workers/docker/marian/marian_service.py`

**What it is**:
- Docker container running Marian NMT models
- HTTP API for translation requests
- Pre-trained Helsinki-NLP models
- Supports 100+ language pairs

**Endpoints**:
- `POST /translate` - Single text translation
- `POST /translate/batch` - Batch translation
- `GET /health` - Health check

## Current MVP Implementation

In the **current MVP** (`packages/workers/src/dubbing-worker.ts`), the translation uses:

### Option 1: LibreTranslate API (Free)
```typescript
const response = await axios.post(
  'https://libretranslate.com/translate',
  {
    q: text,
    source: sourceLanguage,
    target: targetLanguage,
    format: 'text',
  }
);
```

### Option 2: Mock Translation (Fallback)
If LibreTranslate fails, it uses a hardcoded Spanish translation for testing.

## Production Setup

For production, you would:

1. **Deploy Marian Service**:
   ```bash
   cd packages/workers/docker/marian
   docker build -t marian-mt .
   docker run -p 8080:8080 marian-mt
   ```

2. **Configure Environment**:
   ```bash
   MARIAN_SERVICE_URL=http://localhost:8080
   ```

3. **Use Full Pipeline**:
   - The MT Worker will automatically use Marian adapter
   - Supports custom glossaries
   - Preserves timestamps and speaker info
   - Much better quality than LibreTranslate

## Translation Quality Features

### 1. **Glossary Support**
- Users can define custom term translations
- Ensures brand names, technical terms stay consistent
- Applied before and after translation

### 2. **Segment Preservation**
- Maintains original timestamps
- Preserves speaker labels
- Keeps sentence boundaries

### 3. **Batch Processing**
- Translates multiple segments at once
- Configurable batch size (default: 32)
- Improves efficiency

### 4. **Context Awareness**
- Marian models understand context
- Better than word-by-word translation
- Handles idioms and phrases

## Supported Languages

Marian NMT supports 100+ language pairs including:
- English ↔ Spanish
- English ↔ French
- English ↔ German
- English ↔ Chinese
- English ↔ Japanese
- And many more...

## Translation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TRANSLATION STEP                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │  MT Worker      │
                    │  (BullMQ)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Fetch Transcript│
                    │ from Database   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Load Glossary   │
                    │ (if enabled)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Marian Adapter  │
                    │ - Preprocess    │
                    │ - Translate     │
                    │ - Postprocess   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Marian Service  │
                    │ (Docker)        │
                    │ - Neural Model  │
                    │ - Batch Process │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Store Result    │
                    │ in Database     │
                    └────────┬────────┘
                             │
                             ↓
                    Next Step: TTS
```

## Files Involved

### Translation Logic
- `packages/backend/src/adapters/marian-mt-adapter.ts` - Translation adapter
- `packages/workers/src/mt-worker.ts` - Translation worker
- `packages/workers/docker/marian/marian_service.py` - Translation service

### Current MVP
- `packages/workers/src/dubbing-worker.ts` - Simplified pipeline

### Configuration
- `packages/backend/src/adapters/model-config.json` - Model settings
- `.env` - Service URLs and settings

## Testing Translation

To test just the translation:

```bash
# Start Marian service
cd packages/workers/docker/marian
docker-compose up -d

# Test translation endpoint
curl -X POST http://localhost:8080/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "source_language": "en",
    "target_language": "es"
  }'
```

## Summary

**What translates the audio?**
- **Marian NMT** (Neural Machine Translation) - Production
- **LibreTranslate API** - Current MVP fallback
- **Mock translation** - Testing fallback

The translation happens on the **text**, not the audio directly:
1. Audio → Text (Whisper)
2. **Text → Translated Text (Marian)** ⭐
3. Translated Text → Audio (XTTS)

This approach gives better quality because:
- Text translation is more accurate
- Can apply glossaries and corrections
- Preserves timing and structure
- Allows human review/editing
