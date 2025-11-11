# Simplified Pipeline - No Voice Cloning

## Overview
Removed vocal isolation and emotion analysis from the pipeline. Now using OpenAI TTS with preset voices instead of voice cloning.

## New Pipeline Flow

```
1. Frontend uploads video → Backend creates STT job
2. STT Worker: Transcribes with OpenAI Whisper
3. STT Worker: Creates Context Map
4. STT Worker: Triggers Adaptation
5. Adaptation Worker: Translates with Mistral AI
6. Adaptation Worker: Triggers TTS
7. TTS Worker: Synthesizes with OpenAI TTS (preset voices)
8. TTS Worker: Triggers Final Assembly
9. Final Assembly: Creates synchronized audio with Absolute Sync
10. Final Assembly: Triggers Muxing
11. Muxing Worker: Combines audio + video with FFmpeg
```

## Changes Made

### 1. Removed Workers
- ❌ Vocal Isolation Worker (Demucs + Noisereduce)
- ❌ Emotion Analysis Worker (Wav2Vec2)

### 2. Updated STT Worker
- Removed `triggerParallelProcessing()` method
- Removed vocal isolation and emotion analysis queue initialization
- Directly triggers adaptation after Context Map creation
- No longer waits for vocal isolation or emotion analysis

### 3. Updated Adaptation Worker
- Removed `checkVocalIsolationComplete()` method
- Directly triggers TTS after successful adaptation (≥70% success rate)
- No longer waits for vocal isolation to complete

### 4. Updated TTS Worker
- Switched from OpenVoice to OpenAI TTS
- Uses preset voices (alloy, echo, fable, onyx, nova, shimmer)
- No voice cloning capability
- Saves audio to local files (no AWS S3 required for development)
- Removed clean prompt synthesis logic

### 5. Updated Main Workers Index
- Removed vocal isolation and emotion analysis worker initialization
- Updated pipeline description
- Simplified shutdown process

## Benefits

1. **Faster Processing**: No vocal isolation (saves ~3-4 minutes per video)
2. **Simpler Setup**: No Demucs, Noisereduce, or Wav2Vec2 services needed
3. **No GPU Required**: OpenAI TTS runs in the cloud
4. **Easier Development**: No AWS credentials needed (local file storage)
5. **More Reliable**: Fewer moving parts, fewer failure points

## Trade-offs

1. **No Voice Cloning**: Cannot match original speaker's voice
2. **Limited Voices**: Only 6 preset voices available
3. **Less Natural**: May not sound as natural as cloned voice
4. **No Emotion**: Cannot adapt voice based on detected emotions

## OpenAI TTS Voices

- **alloy**: Neutral, balanced voice
- **echo**: Male voice
- **fable**: British accent
- **onyx**: Deep male voice
- **nova**: Female voice
- **shimmer**: Soft female voice

## Development Setup

No additional services required! Just:
1. OpenAI API key (for Whisper + TTS)
2. Mistral API key (for translation)
3. PostgreSQL + Redis

## Testing

Run the test script:
```bash
./test-mistral-fix.sh
```

Expected flow:
1. Video upload ✓
2. STT transcription ✓
3. Context Map creation ✓
4. Adaptation/translation ✓
5. TTS synthesis ✓
6. Final assembly ✓
7. Video muxing ✓

Total time: ~30-60 seconds (vs 3-5 minutes with vocal isolation)
