# Intelligent Translation Adaptation Engine - Quick Start

## Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### 2. Configure Environment

Add to `packages/backend/.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Verify Few-Shot Examples

The system comes with pre-configured examples for:
- English → Spanish (en-es)
- English → French (en-fr)
- English → German (en-de)

Located at: `packages/backend/src/lib/few-shot-examples.json`

## Usage

### Option 1: Via API (Recommended)

**Trigger adaptation for a project:**

```bash
curl -X POST http://localhost:3001/api/projects/{projectId}/adapt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "glossary": {
      "AI": "IA",
      "machine learning": "aprendizaje automático"
    },
    "concurrency": 3
  }'
```

**Check adaptation status:**

```bash
curl http://localhost:3001/api/projects/{projectId}/adaptation-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 2: Programmatic Usage

```typescript
import { createAdaptationService } from './lib/adaptation-service';
import { contextMapService } from './lib/context-map';

// Get Context Map
const contextMap = await contextMapService.get(projectId);

// Create adaptation service
const service = createAdaptationService({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2,
  glossary: {
    'AI': 'IA'
  }
});

// Test connection
const isConnected = await service.testConnection();
if (!isConnected) {
  throw new Error('Failed to connect to Gemini API');
}

// Adapt segments
const results = await service.adaptSegmentsParallel(
  contextMap.segments,
  3 // concurrency
);

// Get statistics
const stats = service.getAdaptationStats(results);
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average attempts: ${stats.averageAttempts}`);

// Generate report
const report = service.generateSummaryReport(results);
console.log(report);

// Update Context Map
const updates = contextMap.segments.map((segment, index) => ({
  segmentId: segment.id,
  data: {
    adapted_text: results[index].adaptedText,
    status: results[index].status,
    attempts: results[index].attempts,
    validation_feedback: results[index].validationFeedback,
  },
}));

await contextMapService.updateSegments(projectId, updates);
```

### Option 3: Via Worker

The adaptation worker automatically processes jobs from the `adaptation` queue.

**Start the worker:**

```bash
cd packages/workers
npm run dev
```

**Enqueue a job:**

```typescript
import { Queue } from 'bullmq';

const adaptationQueue = new Queue('adaptation', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

await adaptationQueue.add('adapt-project', {
  projectId: 'project-123',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  glossary: {
    'AI': 'IA'
  },
  concurrency: 3,
});
```

## Testing

### Test API Connection

```typescript
import { getGeminiClient } from './lib/gemini-client';

const client = getGeminiClient();
const isConnected = await client.testConnection();

if (isConnected) {
  console.log('✓ Gemini API connected successfully');
} else {
  console.log('✗ Failed to connect to Gemini API');
}
```

### Test Single Segment

```typescript
import { createAdaptationService } from './lib/adaptation-service';

const service = createAdaptationService({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2,
});

const testSegment = {
  id: 0,
  start_ms: 0,
  end_ms: 3500,
  duration: 3.5,
  text: "Hello everyone, welcome to my channel.",
  speaker: "SPEAKER_00",
  confidence: 0.95,
  emotion: "happy",
  previous_line: null,
  next_line: "Today we're going to talk about AI.",
};

const result = await service.adaptSegment(testSegment);

console.log('Adapted text:', result.adaptedText);
console.log('Status:', result.status);
console.log('Attempts:', result.attempts);
console.log('Feedback:', result.validationFeedback);
```

Expected output:
```
Adapted text: Hola a todos, bienvenidos a mi canal.
Status: success
Attempts: 1
Feedback: passed LLM-as-Judge validation
```

### Test with Custom Glossary

```typescript
const service = createAdaptationService({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2,
  glossary: {
    'AI': 'IA',
    'machine learning': 'aprendizaje automático',
    'neural network': 'red neuronal',
  },
});

const segment = {
  id: 1,
  start_ms: 3500,
  end_ms: 7200,
  duration: 3.7,
  text: "Today we're going to talk about AI and machine learning.",
  speaker: "SPEAKER_00",
  confidence: 0.92,
  emotion: "neutral",
  previous_line: "Hello everyone, welcome to my channel.",
  next_line: "This technology is amazing.",
};

const result = await service.adaptSegment(segment);
console.log('Adapted text:', result.adaptedText);
// Expected: "Hoy vamos a hablar sobre IA y aprendizaje automático."
```

## Pipeline Integration

The adaptation engine fits into the robust pipeline workflow:

```
STT (Transcription) 
  ↓
Context Map Creation
  ↓
Vocal Isolation + Emotion Analysis (Parallel)
  ↓
Adaptation Engine ← YOU ARE HERE
  ↓
User Review/Edit (Optional)
  ↓
TTS (Voice Generation)
  ↓
Absolute Synchronization
  ↓
Final Video
```

### Trigger Full Pipeline

```typescript
// After STT completes and Context Map is created
await contextMapService.createFromTranscript(projectId, transcript, 'en', 'es');

// Trigger vocal isolation and emotion analysis
await vocalIsolationQueue.add('isolate', { projectId });
await emotionAnalysisQueue.add('analyze', { projectId });

// Wait for both to complete, then trigger adaptation
await adaptationQueue.add('adapt', {
  projectId,
  sourceLanguage: 'en',
  targetLanguage: 'es',
});

// After adaptation, trigger TTS
await ttsQueue.add('synthesize', { projectId });
```

## Monitoring

### View Logs

```bash
# Backend logs
tail -f packages/backend/logs/app.log | grep "Adaptation"

# Worker logs
tail -f packages/workers/logs/worker.log | grep "Adaptation"
```

### Check Queue Status

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('adaptation');

const jobCounts = await queue.getJobCounts();
console.log('Waiting:', jobCounts.waiting);
console.log('Active:', jobCounts.active);
console.log('Completed:', jobCounts.completed);
console.log('Failed:', jobCounts.failed);
```

### View Context Map

```bash
curl http://localhost:3001/api/projects/{projectId}/context-map \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: "GEMINI_API_KEY environment variable is not set"

**Solution:**
```bash
# Add to .env file
echo "GEMINI_API_KEY=your-key-here" >> packages/backend/.env

# Restart services
npm run dev
```

### Issue: "Rate limit exceeded"

**Solution:**
- Reduce concurrency: `concurrency: 1` instead of `3`
- Wait 60 seconds before retrying
- Check your Gemini API quota

### Issue: "No few-shot examples found"

**Solution:**
Add examples to `packages/backend/src/lib/few-shot-examples.json`:

```json
{
  "en-it": [
    {
      "source": "Hello everyone",
      "target": "Ciao a tutti",
      "duration": 2.0,
      "emotion": "happy",
      "source_char_count": 14,
      "target_char_count": 12
    }
  ]
}
```

### Issue: "All segments failed adaptation"

**Checklist:**
1. ✓ Gemini API key is valid
2. ✓ API key has billing enabled
3. ✓ Few-shot examples exist for language pair
4. ✓ Context Map has valid segments
5. ✓ Network connectivity to Google APIs

**Debug:**
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Test API connection
const client = getGeminiClient();
const isConnected = await client.testConnection();
console.log('Connected:', isConnected);

// Test single segment
const result = await service.adaptSegment(testSegment);
console.log('Result:', result);
```

## Performance Tips

### 1. Optimize Concurrency

```typescript
// For small projects (< 50 segments)
concurrency: 3

// For large projects (> 100 segments)
concurrency: 5

// For rate limit issues
concurrency: 1
```

### 2. Use Heuristic-Only Mode (Faster)

```typescript
const validator = new TranslationValidator(geminiClient, adaptationEngine);

const result = await validator.validate(
  originalText,
  translatedText,
  duration,
  targetLanguage,
  { useHeuristicOnly: true } // Skip LLM-as-Judge
);
```

### 3. Batch Processing

```typescript
// Process multiple projects in sequence
for (const projectId of projectIds) {
  await adaptationQueue.add('adapt', { projectId });
}
```

## Cost Estimation

**Per Segment:**
- Translation (Gemini Pro): ~$0.0003
- Validation (Gemini Flash): ~$0.00005
- **Total: ~$0.00035**

**Per Video:**
- 5-minute video (~50 segments): ~$0.018
- 10-minute video (~100 segments): ~$0.035
- 30-minute video (~300 segments): ~$0.105

**Monthly (1000 videos @ 10 min each):**
- ~$35/month in API costs

## Next Steps

1. **Add More Language Pairs**
   - Edit `few-shot-examples.json`
   - Add 5-10 examples per language pair

2. **Customize Prompts**
   - Modify `AdaptationEngine.buildPrompt()`
   - Add domain-specific instructions

3. **Integrate with Frontend**
   - Add "Adapt Translation" button
   - Show real-time progress
   - Display adaptation statistics

4. **Monitor Quality**
   - Track success rates per language pair
   - Collect user feedback
   - A/B test different prompt strategies

## Support

For issues or questions:
1. Check logs: `packages/backend/logs/app.log`
2. Review documentation: `ADAPTATION_ENGINE.md`
3. Test API connection: `client.testConnection()`
4. Enable debug logging: `LOG_LEVEL=debug`

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Few-Shot Learning Guide](https://en.wikipedia.org/wiki/Few-shot_learning)
- [Context Map Documentation](./CONTEXT_MAP.md)
- [Full Architecture](./ADAPTATION_ENGINE.md)
