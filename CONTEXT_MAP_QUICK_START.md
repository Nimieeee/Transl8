# Context Map Quick Start Guide

## What is the Context Map?

The Context Map is a JSON data structure that tracks all information about video segments as they flow through the dubbing pipeline. Think of it as a "passport" for each segment that gets stamped at every processing stage.

## Quick Example

```json
{
  "project_id": "abc123",
  "original_duration_ms": 125500,
  "segments": [
    {
      "id": 0,
      "start_ms": 0,
      "end_ms": 3500,
      "duration": 3.5,
      "text": "Hello everyone",
      "speaker": "SPEAKER_00",
      "confidence": 0.95,
      "clean_prompt_path": "/temp/abc123/clean_0.wav",
      "emotion": "happy",
      "adapted_text": "Hola a todos",
      "status": "success",
      "attempts": 1,
      "generated_audio_path": "/temp/abc123/dubbed_0.wav"
    }
  ]
}
```

## For TypeScript Workers

### 1. Import the Client

```typescript
import { contextMapClient } from './lib/context-map-client';
```

### 2. Read Context Map

```typescript
const contextMap = await contextMapClient.get(projectId);

// Process each segment
for (const segment of contextMap.segments) {
  console.log(`Segment ${segment.id}: ${segment.text}`);
}
```

### 3. Update After Your Processing

```typescript
// After vocal isolation
await contextMapClient.addCleanPromptPath(projectId, segmentId, cleanPath);

// After emotion analysis
await contextMapClient.addEmotionTag(projectId, segmentId, 'happy');

// After translation
await contextMapClient.addAdaptedText(
  projectId, 
  segmentId, 
  translatedText, 
  'success', 
  attempts
);

// After TTS
await contextMapClient.addGeneratedAudioPath(projectId, segmentId, audioPath);
```

## For Python Workers

### 1. Import the Service

```python
from context_map_service import context_map_service
```

### 2. Load Context Map

```python
context_map = context_map_service.load(project_id)

# Process each segment
for segment in context_map.segments:
    print(f"Segment {segment.id}: {segment.text}")
```

### 3. Update After Your Processing

```python
# After vocal isolation
context_map_service.add_clean_prompt_path(project_id, segment_id, clean_path)

# After emotion analysis
context_map_service.add_emotion_tag(project_id, segment_id, 'happy')

# After translation
context_map_service.add_adapted_text(
    project_id,
    segment_id,
    translated_text,
    'success',
    attempts
)

# After TTS
context_map_service.add_generated_audio_path(project_id, segment_id, audio_path)
```

## Common Patterns

### Check if Segment is Ready for Processing

```typescript
// TypeScript
const segment = contextMap.segments[0];
if (segment.clean_prompt_path && segment.emotion && segment.adapted_text) {
  // Ready for TTS
}
```

```python
# Python
segment = context_map.segments[0]
if segment.clean_prompt_path and segment.emotion and segment.adapted_text:
    # Ready for TTS
```

### Get Progress Summary

```typescript
// TypeScript
const summary = await contextMapClient.getSummary(projectId);
console.log(`Progress: ${summary.completionRate}%`);
console.log(`Success: ${summary.successfulSegments}/${summary.totalSegments}`);
```

```python
# Python
summary = context_map_service.get_summary(project_id)
print(f"Progress: {summary['completion_rate']}%")
print(f"Success: {summary['successful_segments']}/{summary['total_segments']}")
```

### Handle Errors

```typescript
// TypeScript
try {
  await contextMapClient.addCleanPromptPath(projectId, segmentId, path);
} catch (error) {
  logger.error('Failed to update Context Map:', error);
  // Implement retry or fallback
}
```

```python
# Python
try:
    context_map_service.add_clean_prompt_path(project_id, segment_id, path)
except Exception as e:
    logger.error(f'Failed to update Context Map: {e}')
    # Implement retry or fallback
```

## Segment Status Values

- `pending`: Not yet processed
- `success`: Successfully processed
- `failed_adaptation`: Translation adaptation failed
- `failed_tts`: TTS generation failed
- `failed_vocal_isolation`: Vocal isolation failed

## Emotion Tags

- `neutral`
- `happy`
- `sad`
- `angry`
- `excited`
- `fearful`
- `surprised`
- `disgusted`

## API Endpoints

```bash
# Get Context Map
GET /api/projects/:projectId/context-map

# Get summary
GET /api/projects/:projectId/context-map/summary

# Export as JSON
GET /api/projects/:projectId/context-map/export

# Validate structure
GET /api/projects/:projectId/context-map/validate

# Update segment
PUT /api/projects/:projectId/context-map/segments/:segmentId
```

## Debugging

### Export Context Map

```bash
curl http://localhost:3001/api/projects/abc123/context-map/export \
  -o context_map.json
```

### View in Browser

```
http://localhost:3001/api/projects/abc123/context-map
```

### Check Validation

```bash
curl http://localhost:3001/api/projects/abc123/context-map/validate
```

## Best Practices

1. **Always check if Context Map exists** before processing
2. **Update Context Map immediately** after processing each segment
3. **Use try-catch** for all Context Map operations
4. **Check segment status** before processing to avoid duplicate work
5. **Monitor progress** using the summary endpoint
6. **Export for debugging** when issues occur

## Need Help?

- Full documentation: `packages/backend/CONTEXT_MAP.md`
- Implementation details: `CONTEXT_MAP_IMPLEMENTATION.md`
- Integration examples: `packages/workers/src/lib/context-map-integration-example.ts`

## Quick Checklist for New Workers

- [ ] Import Context Map client/service
- [ ] Load Context Map at start of processing
- [ ] Check if segments need processing (status check)
- [ ] Process segments
- [ ] Update Context Map after each segment
- [ ] Handle errors gracefully
- [ ] Log progress using summary
