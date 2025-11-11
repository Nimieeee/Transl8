# Model Adapter Layer

This directory contains the abstract base classes and interfaces for all AI model adapters in the video dubbing pipeline. The adapter pattern allows the platform to swap or upgrade models without modifying core pipeline logic.

## Overview

The adapter layer defines standardized interfaces for four pipeline stages:

1. **STT (Speech-to-Text)**: Transcription with speaker diarization
2. **MT (Machine Translation)**: Text translation with context preservation
3. **TTS (Text-to-Speech)**: Voice generation and cloning
4. **Lip-Sync**: Video lip synchronization with face enhancement

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Pipeline Workers                       │
│  (STTWorker, MTWorker, TTSWorker, LipSyncWorker)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Uses standardized interface
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Adapter Layer                            │
│  (STTAdapter, MTAdapter, TTSAdapter, LipSyncAdapter)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Implements interface
                     │
┌────────────────────▼────────────────────────────────────┐
│              Concrete Implementations                    │
│  WhisperPyannoteAdapter, MarianMTAdapter,               │
│  StyleTTSAdapter, XTTSAdapter, Wav2LipAdapter           │
└─────────────────────────────────────────────────────────┘
```

## Adapter Contract

### Requirements for All Adapters

Every adapter implementation MUST:

1. **Extend the appropriate abstract base class** (`STTAdapter`, `MTAdapter`, `TTSAdapter`, or `LipSyncAdapter`)
2. **Implement all abstract methods** defined in the base class
3. **Return standardized data structures** as defined in `types.ts`
4. **Include metadata** with processing time, model name/version, and confidence scores
5. **Implement health checks** that verify model availability and measure latency
6. **Handle errors gracefully** and provide meaningful error messages
7. **Be stateless** - no shared state between method calls
8. **Support concurrent requests** - thread-safe or process-isolated

### STTAdapter Contract

**Purpose**: Convert audio to text with speaker identification

**Input**:
- Audio file path (WAV, MP3, or other common formats)
- Source language code (ISO 639-1)

**Output**:
- `STTResult` containing:
  - Full transcript text
  - Time-coded segments with speaker labels
  - Word-level timestamps (optional but recommended)
  - Confidence scores per segment
  - Speaker count

**Requirements**:
- MUST support multi-speaker audio (diarization)
- MUST provide word-level or segment-level timestamps
- MUST return confidence scores for quality assessment
- SHOULD handle background noise robustly
- SHOULD support common audio formats (WAV, MP3, M4A)

**Example Implementation**:
```typescript
class WhisperPyannoteAdapter extends STTAdapter {
  name = 'whisper-pyannote';
  version = '1.0.0';

  async transcribe(audioPath: string, language: string): Promise<STTResult> {
    // 1. Run Whisper for transcription
    // 2. Run pyannote.audio for diarization
    // 3. Align speaker labels with transcript segments
    // 4. Return standardized STTResult
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Verify model is loaded and responsive
  }
}
```

### MTAdapter Contract

**Purpose**: Translate text while preserving context and timing

**Input**:
- Text or transcript segments
- Source and target language codes (ISO 639-1)
- Optional glossary for custom term translations

**Output**:
- `MTResult` containing:
  - Translated segments with preserved timing
  - Full translated text
  - Confidence scores (if available)

**Requirements**:
- MUST preserve segment boundaries and timestamps
- MUST preserve speaker labels
- MUST apply glossary terms consistently when provided
- SHOULD maintain natural phrasing and context
- SHOULD handle technical terminology appropriately

**Example Implementation**:
```typescript
class MarianMTAdapter extends MTAdapter {
  name = 'marian-nmt';
  version = '1.0.0';

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Record<string, string>
  ): Promise<string> {
    // Translate single text string
  }

  async translateSegments(
    segments: TranscriptSegment[],
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Record<string, string>
  ): Promise<MTResult> {
    // 1. Translate each segment
    // 2. Apply glossary replacements
    // 3. Preserve timing and speaker info
    // 4. Return standardized MTResult
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Verify model is loaded and responsive
  }
}
```

### TTSAdapter Contract

**Purpose**: Generate speech audio from text with voice customization

**Input**:
- Text or translation segments
- Voice configuration (preset or clone)
- Optional timing constraints
- Optional speaker-to-voice mapping for multi-speaker content

**Output**:
- `TTSResult` containing:
  - Complete audio file (WAV format)
  - Individual segment audio data
  - Timing information

**Requirements**:
- MUST support both preset voices and voice clones
- MUST generate audio in WAV format (16kHz or 44.1kHz PCM)
- MUST support multi-speaker content with different voices
- MUST preserve emotional tone and prosody when possible
- SHOULD support voice parameters (speed, pitch, emotion)
- SHOULD align audio duration with original timing constraints

**Example Implementation**:
```typescript
class StyleTTSAdapter extends TTSAdapter {
  name = 'styletts2';
  version = '1.0.0';

  async synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    timestamps?: { start: number; end: number }
  ): Promise<Buffer> {
    // Generate audio for single text segment
  }

  async synthesizeSegments(
    segments: TranslationSegment[],
    speakerVoiceMapping: SpeakerVoiceMapping
  ): Promise<TTSResult> {
    // 1. Generate audio for each segment with appropriate voice
    // 2. Concatenate segments with proper timing
    // 3. Return complete audio file
  }

  async createVoiceClone(audioPath: string, voiceName: string): Promise<string> {
    // 1. Validate audio sample (min 6 seconds)
    // 2. Generate voice embeddings
    // 3. Store voice model
    // 4. Return voice clone ID
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Verify model is loaded and responsive
  }
}
```

### LipSyncAdapter Contract

**Purpose**: Synchronize lip movements with new audio track

**Input**:
- Video file path
- Audio file path
- Output path for synced video
- Optional face enhancement flag

**Output**:
- `LipSyncResult` containing:
  - Path to synced video file
  - Processing metadata

**Requirements**:
- MUST detect faces in video frames
- MUST synchronize lip movements with audio
- SHOULD apply face restoration (GFPGAN) when requested
- SHOULD handle multiple faces in frame
- SHOULD maintain video quality

**Example Implementation**:
```typescript
class Wav2LipAdapter extends LipSyncAdapter {
  name = 'wav2lip';
  version = '1.0.0';

  async sync(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    enhanceFaces: boolean = false
  ): Promise<LipSyncResult> {
    // 1. Detect faces in video
    // 2. Apply Wav2Lip for lip-sync
    // 3. Apply GFPGAN if enhanceFaces is true
    // 4. Save output video
    // 5. Return path and metadata
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Verify model is loaded and responsive
  }
}
```

## Data Structures

### Transcript Format

```typescript
{
  text: "Full transcript text",
  duration: 125.5,
  language: "en",
  segments: [
    {
      id: 0,
      start: 0.0,
      end: 3.5,
      text: "Hello everyone, welcome to my channel.",
      speaker: "SPEAKER_00",
      confidence: 0.95,
      words: [
        { word: "Hello", start: 0.0, end: 0.5, confidence: 0.98 },
        { word: "everyone", start: 0.5, end: 1.0, confidence: 0.96 }
      ]
    }
  ],
  speakerCount: 2
}
```

### Translation Format

```typescript
{
  sourceLanguage: "en",
  targetLanguage: "es",
  segments: [
    {
      id: 0,
      sourceText: "Hello everyone, welcome to my channel.",
      translatedText: "Hola a todos, bienvenidos a mi canal.",
      start: 0.0,
      end: 3.5,
      speaker: "SPEAKER_00",
      confidence: 0.92
    }
  ],
  fullText: "Hola a todos, bienvenidos a mi canal..."
}
```

### Voice Configuration Format

```typescript
{
  type: "preset" | "clone",
  voiceId: "uuid-or-preset-name",
  parameters: {
    speed: 1.0,      // 0.5-2.0
    pitch: 0,        // -12 to +12 semitones
    emotion: "neutral",
    style: "conversational"
  }
}
```

### Speaker-to-Voice Mapping

```typescript
{
  "SPEAKER_00": {
    type: "preset",
    voiceId: "en-male-1"
  },
  "SPEAKER_01": {
    type: "clone",
    voiceId: "user-voice-clone-uuid"
  }
}
```

## Error Handling

All adapters MUST handle errors gracefully and throw meaningful exceptions:

```typescript
class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

// Example error codes:
// - MODEL_UNAVAILABLE (retryable: true)
// - INVALID_INPUT (retryable: false)
// - PROCESSING_FAILED (retryable: true)
// - UNSUPPORTED_LANGUAGE (retryable: false)
// - INSUFFICIENT_QUALITY (retryable: false)
```

## Health Checks

All adapters MUST implement health checks that:

1. Verify the model is loaded and accessible
2. Measure response latency
3. Return health status and error details if unhealthy

Health checks should be lightweight and complete within 5 seconds.

```typescript
{
  healthy: true,
  latency: 150, // milliseconds
  timestamp: new Date()
}
```

## Testing Adapters

When implementing a new adapter:

1. **Unit test** each method with sample inputs
2. **Integration test** with real model inference
3. **Benchmark** processing time and quality metrics
4. **Load test** concurrent request handling
5. **Validate** output format compliance

## Adding a New Adapter

1. Create a new file in `packages/backend/src/adapters/implementations/`
2. Import the appropriate base class from `types.ts`
3. Implement all abstract methods
4. Add the adapter to the model registry (see configuration system)
5. Write tests for the adapter
6. Document any model-specific requirements or limitations

## References

- Requirements: 14.1, 14.3
- Design Document: `.kiro/specs/ai-video-dubbing-platform/design.md`
- Model Configuration: See `model-registry.ts` for configuration system
