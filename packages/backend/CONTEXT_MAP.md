# Context Map System

## Overview

The Context Map is a central data structure that flows through the entire robust dubbing pipeline. It contains all segment metadata including timing, emotion tags, clean audio paths, translation status, and generated audio paths.

## Purpose

The Context Map serves as:
- **Single Source of Truth**: All pipeline stages read from and write to the Context Map
- **Progress Tracking**: Track which segments have been processed at each stage
- **Quality Assurance**: Store validation results and retry attempts
- **Debugging Tool**: Export complete pipeline state for troubleshooting
- **Synchronization Data**: Provide exact timing information for absolute synchronization

## Data Structure

### Context Map

```typescript
interface ContextMap {
  project_id: string;
  original_duration_ms: number;
  source_language: string;
  target_language: string;
  created_at: string;
  updated_at: string;
  segments: ContextMapSegment[];
}
```

### Context Map Segment

```typescript
interface ContextMapSegment {
  id: number;
  start_ms: number;
  end_ms: number;
  duration: number;
  text: string;
  speaker: string;
  confidence: number;
  clean_prompt_path?: string;           // Added by vocal isolation worker
  emotion?: EmotionTag;                 // Added by emotion analysis worker
  previous_line?: string | null;
  next_line?: string | null;
  adapted_text?: string;                // Added by adaptation worker
  status?: SegmentStatus;               // Updated by adaptation worker
  attempts?: number;                    // Updated by adaptation worker
  generated_audio_path?: string;        // Added by TTS worker
  validation_feedback?: string;         // Added by adaptation worker
}
```

### Emotion Tags

```typescript
type EmotionTag = 
  | 'neutral' 
  | 'happy' 
  | 'sad' 
  | 'angry' 
  | 'excited' 
  | 'fearful' 
  | 'surprised' 
  | 'disgusted';
```

### Segment Status

```typescript
type SegmentStatus = 
  | 'pending'                    // Not yet processed
  | 'success'                    // Successfully processed
  | 'failed_adaptation'          // Translation adaptation failed
  | 'failed_tts'                 // TTS generation failed
  | 'failed_vocal_isolation';    // Vocal isolation failed
```

## Pipeline Flow

### 1. Creation (After STT)

The Context Map is created after the STT worker completes transcription:

```typescript
const contextMap = await contextMapService.createFromTranscript(
  projectId,
  transcript,
  sourceLanguage,
  targetLanguage
);
```

### 2. Vocal Isolation Updates

The vocal isolation worker adds clean prompt paths:

```typescript
await contextMapService.addCleanPromptPath(
  projectId,
  segmentId,
  cleanPromptPath
);
```

### 3. Emotion Analysis Updates

The emotion analysis worker adds emotion tags:

```typescript
await contextMapService.addEmotionTag(
  projectId,
  segmentId,
  emotion
);
```

### 4. Translation Adaptation Updates

The adaptation worker adds translated text and status:

```typescript
await contextMapService.addAdaptedText(
  projectId,
  segmentId,
  adaptedText,
  status,
  attempts,
  validationFeedback
);
```

### 5. TTS Updates

The TTS worker adds generated audio paths:

```typescript
await contextMapService.addGeneratedAudioPath(
  projectId,
  segmentId,
  generatedAudioPath
);
```

### 6. Final Assembly

The assembly worker reads all segments and creates the final synchronized audio:

```typescript
const contextMap = await contextMapService.get(projectId);

for (const segment of contextMap.segments) {
  if (segment.status === 'success' && segment.generated_audio_path) {
    // Use segment timing and audio path for absolute synchronization
  }
}
```

## API Endpoints

### Get Context Map

```http
GET /api/projects/:projectId/context-map
```

Returns the complete Context Map for a project.

### Get Summary

```http
GET /api/projects/:projectId/context-map/summary
```

Returns summary statistics:
- Total segments
- Successful segments
- Failed segments
- Pending segments
- Average attempts
- Completion rate

### Export Context Map

```http
GET /api/projects/:projectId/context-map/export
```

Downloads the Context Map as a JSON file for debugging.

### Validate Context Map

```http
GET /api/projects/:projectId/context-map/validate
```

Validates the Context Map structure and returns any errors.

### Update Segment

```http
PUT /api/projects/:projectId/context-map/segments/:segmentId
```

Updates a specific segment with new data.

## Worker Integration

### TypeScript Workers

```typescript
import { contextMapClient } from './lib/context-map-client';

// Read Context Map
const contextMap = await contextMapClient.get(projectId);

// Update segment
await contextMapClient.addCleanPromptPath(projectId, segmentId, path);
await contextMapClient.addEmotionTag(projectId, segmentId, emotion);
await contextMapClient.addAdaptedText(projectId, segmentId, text, status, attempts);
await contextMapClient.addGeneratedAudioPath(projectId, segmentId, path);

// Get summary
const summary = await contextMapClient.getSummary(projectId);
```

### Python Workers

```python
from context_map_service import context_map_service

# Load Context Map
context_map = context_map_service.load(project_id)

# Update segment
context_map_service.add_clean_prompt_path(project_id, segment_id, path)
context_map_service.add_emotion_tag(project_id, segment_id, emotion)
context_map_service.add_adapted_text(project_id, segment_id, text, status, attempts)
context_map_service.add_generated_audio_path(project_id, segment_id, path)

# Get summary
summary = context_map_service.get_summary(project_id)
```

## Storage

The Context Map is stored in two places:

1. **Database**: PostgreSQL with JSONB column for efficient querying
2. **File System**: JSON files in `temp/{projectId}/context_map.json` for debugging

## Validation

The Context Map validates:
- Required fields are present
- Timing values are valid (start < end)
- No overlapping segments
- Segments are in chronological order

## Best Practices

### 1. Always Check for Existence

```typescript
const contextMap = await contextMapClient.get(projectId);
if (!contextMap) {
  throw new Error('Context Map not found');
}
```

### 2. Handle Update Failures

```typescript
try {
  await contextMapClient.updateSegment(projectId, segmentId, updates);
} catch (error) {
  logger.error('Failed to update Context Map:', error);
  // Implement retry logic or fallback
}
```

### 3. Use Batch Processing

Process multiple segments in parallel but update Context Map sequentially to avoid race conditions.

### 4. Validate Before Processing

```typescript
const validation = await contextMapClient.validate(projectId);
if (!validation.valid) {
  throw new Error(`Invalid Context Map: ${validation.errors.join(', ')}`);
}
```

### 5. Monitor Progress

```typescript
const summary = await contextMapClient.getSummary(projectId);
logger.info(`Progress: ${summary.completionRate}%`);
```

## Troubleshooting

### Context Map Not Found

- Ensure STT worker completed successfully
- Check that `createFromTranscript` was called
- Verify project ID is correct

### Segment Updates Not Persisting

- Check database connection
- Verify segment ID exists in Context Map
- Check for concurrent update conflicts

### Invalid Context Map Structure

- Run validation endpoint to identify issues
- Check for missing required fields
- Verify timing values are correct

### Performance Issues

- Use batch updates when possible
- Avoid frequent full Context Map reads
- Use summary endpoint for progress tracking

## Example: Complete Pipeline Integration

```typescript
// 1. STT Worker creates Context Map
const transcript = await sttWorker.transcribe(audioPath);
const contextMap = await contextMapService.createFromTranscript(
  projectId,
  transcript,
  'en',
  'es'
);

// 2. Vocal Isolation Worker processes segments
for (const segment of contextMap.segments) {
  const cleanPath = await vocalIsolationWorker.process(segment);
  await contextMapClient.addCleanPromptPath(projectId, segment.id, cleanPath);
}

// 3. Emotion Analysis Worker processes segments
for (const segment of contextMap.segments) {
  const emotion = await emotionWorker.analyze(segment.clean_prompt_path);
  await contextMapClient.addEmotionTag(projectId, segment.id, emotion);
}

// 4. Adaptation Worker processes segments
for (const segment of contextMap.segments) {
  const result = await adaptationWorker.adapt(segment);
  await contextMapClient.addAdaptedText(
    projectId,
    segment.id,
    result.text,
    result.status,
    result.attempts,
    result.feedback
  );
}

// 5. TTS Worker processes successful segments
const updatedContextMap = await contextMapClient.get(projectId);
for (const segment of updatedContextMap.segments) {
  if (segment.status === 'success' && segment.adapted_text) {
    const audioPath = await ttsWorker.synthesize(segment);
    await contextMapClient.addGeneratedAudioPath(projectId, segment.id, audioPath);
  }
}

// 6. Assembly Worker creates final output
const finalContextMap = await contextMapClient.get(projectId);
const finalAudio = await assemblyWorker.assemble(finalContextMap);
```

## Related Documentation

- [Vocal Isolation Implementation](./VOCAL_ISOLATION.md)
- [Emotion Analysis Implementation](./EMOTION_ANALYSIS_IMPLEMENTATION.md)
- [Translation Pipeline](./TRANSLATION_PIPELINE.md)
- [Absolute Synchronization](./ABSOLUTE_SYNCHRONIZATION.md)
