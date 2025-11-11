# Model Adapter System - Usage Guide

This guide explains how to use the model adapter system in the AI Video Dubbing Platform.

## Quick Start

### 1. Import the Adapter System

```typescript
import {
  modelRegistry,
  STTAdapter,
  MTAdapter,
  TTSAdapter,
  LipSyncAdapter,
  loadModelConfig,
} from './adapters';
```

### 2. Load Configuration

```typescript
// Load model configurations from JSON file
const config = loadModelConfig();

// Or specify a custom config path
const config = loadModelConfig('/path/to/custom-config.json');
```

### 3. Register Adapters

```typescript
import { WhisperPyannoteAdapter } from './adapters/implementations/whisper-pyannote';

// Create adapter instance
const sttAdapter = new WhisperPyannoteAdapter();

// Register with configuration
modelRegistry.register(sttAdapter, {
  name: 'whisper-pyannote',
  version: '1.0.0',
  stage: 'stt',
  enabled: true,
  priority: 100,
  capabilities: {
    languages: ['en', 'es', 'fr', 'de'],
    maxDuration: 3600,
    requiresGPU: true,
  },
});
```

### 4. Get and Use Adapters

```typescript
// Get the best available STT adapter
const sttAdapter = modelRegistry.getAdapter<STTAdapter>('stt');

if (sttAdapter) {
  // Use the adapter
  const result = await sttAdapter.transcribe('/path/to/audio.wav', 'en');
  console.log('Transcript:', result.transcript.text);
}

// Get adapter with specific requirements
const mtAdapter = modelRegistry.getAdapter<MTAdapter>('mt', {
  language: 'es',
  preferredModel: 'llama-mt',
});
```

## Working with Different Stages

### Speech-to-Text (STT)

```typescript
const sttAdapter = modelRegistry.getAdapter<STTAdapter>('stt');

if (sttAdapter) {
  const result = await sttAdapter.transcribe(audioPath, 'en');
  
  console.log('Full text:', result.transcript.text);
  console.log('Duration:', result.transcript.duration);
  console.log('Speakers:', result.transcript.speakerCount);
  
  // Access segments with timing and speaker info
  for (const segment of result.transcript.segments) {
    console.log(`[${segment.start}s - ${segment.end}s] ${segment.speaker}: ${segment.text}`);
  }
}
```

### Machine Translation (MT)

```typescript
const mtAdapter = modelRegistry.getAdapter<MTAdapter>('mt');

if (mtAdapter) {
  // Translate simple text
  const translated = await mtAdapter.translate(
    'Hello world',
    'en',
    'es',
    { 'world': 'mundo' } // Optional glossary
  );
  
  // Translate transcript segments
  const result = await mtAdapter.translateSegments(
    transcriptSegments,
    'en',
    'es'
  );
  
  console.log('Translated text:', result.translation.fullText);
}
```

### Text-to-Speech (TTS)

```typescript
const ttsAdapter = modelRegistry.getAdapter<TTSAdapter>('tts');

if (ttsAdapter) {
  // Synthesize with preset voice
  const voiceConfig = {
    type: 'preset' as const,
    voiceId: 'en-male-1',
    parameters: {
      speed: 1.0,
      pitch: 0,
      emotion: 'neutral',
    },
  };
  
  const audioBuffer = await ttsAdapter.synthesize(
    'Hello world',
    voiceConfig
  );
  
  // Synthesize multi-speaker content
  const speakerMapping = {
    'SPEAKER_00': { type: 'preset' as const, voiceId: 'en-male-1' },
    'SPEAKER_01': { type: 'clone' as const, voiceId: 'user-voice-123' },
  };
  
  const result = await ttsAdapter.synthesizeSegments(
    translationSegments,
    speakerMapping
  );
  
  // Create voice clone
  const voiceCloneId = await ttsAdapter.createVoiceClone(
    '/path/to/sample.wav',
    'My Voice'
  );
}
```

### Lip-Sync

```typescript
const lipSyncAdapter = modelRegistry.getAdapter<LipSyncAdapter>('lipsync');

if (lipSyncAdapter) {
  const result = await lipSyncAdapter.sync(
    '/path/to/video.mp4',
    '/path/to/audio.wav',
    '/path/to/output.mp4',
    true // Enable face enhancement
  );
  
  console.log('Synced video:', result.videoPath);
  console.log('Processing time:', result.metadata.processingTime);
}
```

## Health Checks

### Check Individual Model

```typescript
const health = await modelRegistry.checkHealth('stt', 'whisper-pyannote');

console.log('Status:', health.status); // 'healthy' | 'unhealthy' | 'unknown'
console.log('Latency:', health.latency, 'ms');
console.log('Last check:', health.lastCheck);
```

### Check All Models in a Stage

```typescript
const stageHealth = await modelRegistry.checkStageHealth('mt');

for (const health of stageHealth) {
  console.log(`${health.modelName}: ${health.status}`);
}
```

### Check All Models

```typescript
const allHealth = await modelRegistry.checkAllHealth();

for (const [stage, healthList] of allHealth.entries()) {
  console.log(`\n${stage.toUpperCase()}:`);
  for (const health of healthList) {
    console.log(`  ${health.modelName}: ${health.status}`);
  }
}
```

## Configuration Management

### Get Model Configuration

```typescript
const config = modelRegistry.getConfig('stt', 'whisper-pyannote');

console.log('Enabled:', config?.enabled);
console.log('Priority:', config?.priority);
console.log('Languages:', config?.capabilities?.languages);
```

### Update Configuration

```typescript
// Enable/disable a model
modelRegistry.setEnabled('mt', 'llama-mt', true);

// Update priority
modelRegistry.updateConfig('stt', 'whisper-pyannote', {
  priority: 150,
});

// Update multiple fields
modelRegistry.updateConfig('tts', 'styletts2', {
  enabled: true,
  priority: 100,
  capabilities: {
    ...existingCapabilities,
    languages: ['en', 'es', 'fr', 'de', 'it'],
  },
});
```

### Get Registry Summary

```typescript
const summary = modelRegistry.getSummary();

for (const stage of summary) {
  console.log(`\n${stage.stage.toUpperCase()}:`);
  for (const model of stage.models) {
    console.log(`  ${model.name} v${model.version}`);
    console.log(`    Enabled: ${model.enabled}`);
    console.log(`    Priority: ${model.priority}`);
    console.log(`    Health: ${model.health}`);
  }
}
```

## API Endpoints

The model management system exposes REST API endpoints:

### Get All Model Health

```bash
GET /api/models/health
```

Response:
```json
{
  "success": true,
  "data": {
    "stt": [
      {
        "modelName": "whisper-pyannote",
        "stage": "stt",
        "status": "healthy",
        "latency": 150,
        "lastCheck": "2025-11-03T10:30:00Z"
      }
    ],
    "mt": [...],
    "tts": [...],
    "lipsync": [...]
  },
  "timestamp": "2025-11-03T10:30:00Z"
}
```

### Get Stage Health

```bash
GET /api/models/health/:stage
```

Example:
```bash
GET /api/models/health/stt
```

### Get Model Health

```bash
GET /api/models/health/:stage/:name
```

Example:
```bash
GET /api/models/health/stt/whisper-pyannote
```

### Get Models Summary

```bash
GET /api/models/summary
```

### Get Models for Stage

```bash
GET /api/models/:stage
```

Example:
```bash
GET /api/models/mt
```

### Get Model Configuration

```bash
GET /api/models/:stage/:name
```

Example:
```bash
GET /api/models/tts/styletts2
```

### Enable/Disable Model (Requires Auth)

```bash
PUT /api/models/:stage/:name/enable
Content-Type: application/json
Authorization: Bearer <token>

{
  "enabled": true
}
```

### Update Model Priority (Requires Auth)

```bash
PUT /api/models/:stage/:name/priority
Content-Type: application/json
Authorization: Bearer <token>

{
  "priority": 150
}
```

## Best Practices

### 1. Always Check for Adapter Availability

```typescript
const adapter = modelRegistry.getAdapter<STTAdapter>('stt');

if (!adapter) {
  throw new Error('No STT adapter available');
}

// Use adapter...
```

### 2. Handle Errors Gracefully

```typescript
try {
  const result = await adapter.transcribe(audioPath, language);
  // Process result...
} catch (error) {
  console.error('Transcription failed:', error);
  // Fallback logic or error reporting
}
```

### 3. Use Health Checks Before Processing

```typescript
const health = await modelRegistry.checkHealth('stt', 'whisper-pyannote');

if (health.status !== 'healthy') {
  console.warn('Model unhealthy, using fallback');
  // Use alternative model or queue for retry
}
```

### 4. Prefer Language-Specific Adapters

```typescript
// Request adapter that supports specific language
const adapter = modelRegistry.getAdapter<MTAdapter>('mt', {
  language: 'ja', // Japanese
});
```

### 5. Monitor Processing Times

```typescript
const result = await adapter.transcribe(audioPath, language);

console.log('Processing time:', result.metadata.processingTime, 'ms');

// Log for monitoring/optimization
logger.info('STT processing', {
  model: result.metadata.modelName,
  duration: result.metadata.processingTime,
  confidence: result.metadata.confidence,
});
```

## Testing with Mock Adapters

For development and testing, use the mock adapters:

```typescript
import { registerMockAdapters } from './adapters/examples/mock-adapter.example';

// Register all mock adapters
registerMockAdapters();

// Now you can use the adapters without real models
const adapter = modelRegistry.getAdapter<STTAdapter>('stt');
const result = await adapter.transcribe('/path/to/audio.wav', 'en');
```

## Implementing Custom Adapters

See `README.md` for detailed adapter contract requirements.

Basic structure:

```typescript
import { STTAdapter, STTResult, HealthCheckResult } from './adapters';

export class MyCustomSTTAdapter extends STTAdapter {
  name = 'my-custom-stt';
  version = '1.0.0';

  async transcribe(audioPath: string, language: string): Promise<STTResult> {
    // Your implementation
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Your health check logic
  }
}
```

Then register it:

```typescript
modelRegistry.register(new MyCustomSTTAdapter(), {
  name: 'my-custom-stt',
  version: '1.0.0',
  stage: 'stt',
  enabled: true,
  priority: 50,
});
```

## Troubleshooting

### No Adapter Available

If `getAdapter()` returns `null`:
- Check that adapters are registered
- Verify the stage name is correct
- Check that at least one adapter is enabled
- Verify language support if specified

### Adapter Health Check Fails

- Check model service is running
- Verify network connectivity
- Check GPU availability if required
- Review model logs for errors

### Configuration Not Loading

- Verify `model-config.json` exists
- Check JSON syntax is valid
- Ensure all required fields are present
- Check file permissions

## References

- Adapter Contract: `README.md`
- Type Definitions: `types.ts`
- Model Registry: `model-registry.ts`
- Configuration: `model-config.json`
- API Routes: `routes/models.ts`
