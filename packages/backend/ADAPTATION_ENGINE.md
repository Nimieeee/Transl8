# Intelligent Translation Adaptation Engine

## Overview

The Intelligent Translation Adaptation Engine is a sophisticated system that generates timing-aware translations using Large Language Models (LLMs) with few-shot learning and validation loops. It ensures that translated text fits naturally within the original video timing while preserving meaning and emotional tone.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Adaptation Worker                         │
│                  (BullMQ Job Processor)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Adaptation Service                          │
│              (Orchestrates Adaptation)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Adaptation   │  │  Translation │  │   Gemini     │
│   Engine     │  │  Validator   │  │   Client     │
│              │  │              │  │              │
│ - Prompt     │  │ - Heuristic  │  │ - Gemini Pro │
│   Building   │  │   Checks     │  │ - Gemini     │
│ - Few-Shot   │  │ - LLM-as-    │  │   Flash      │
│   Examples   │  │   Judge      │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Components

### 1. Few-Shot Examples Repository

**Location:** `packages/backend/src/lib/few-shot-examples.json`

High-quality translation examples that guide the LLM toward timing-aware behavior.

**Schema:**
```json
{
  "en-es": [
    {
      "source": "Hello everyone, welcome to my channel.",
      "target": "Hola a todos, bienvenidos a mi canal.",
      "duration": 3.5,
      "emotion": "happy",
      "source_char_count": 39,
      "target_char_count": 38
    }
  ]
}
```

**Supported Language Pairs (11 total):**

European Languages:
- English → Spanish (en-es)
- English → French (en-fr)
- English → German (en-de)
- English → Italian (en-it)
- English → Portuguese (en-pt)
- English → Russian (en-ru)

Asian Languages:
- English → Japanese (en-ja)
- English → Korean (en-ko)
- English → Chinese (en-zh)
- English → Hindi (en-hi)

Middle Eastern Languages:
- English → Arabic (en-ar)

### 2. Few-Shot Loader

**Location:** `packages/backend/src/lib/few-shot-loader.ts`

Loads and validates few-shot examples.

**Usage:**
```typescript
import { fewShotLoader } from './lib/few-shot-loader';

// Get examples for a language pair
const examples = fewShotLoader.getExamples('en', 'es');

// Check if language pair is supported
const isSupported = fewShotLoader.isLanguagePairSupported('en', 'es');
```

### 3. Adaptation Engine

**Location:** `packages/backend/src/lib/adaptation-engine.ts`

Core engine that builds dynamic prompts with context and few-shot examples.

**Features:**
- Dynamic prompt generation with few-shot examples
- Context injection (duration, emotion, previous/next lines)
- Glossary term injection
- Heuristic validation (character count ratio, words per second)

**Usage:**
```typescript
import { AdaptationEngine } from './lib/adaptation-engine';

const engine = new AdaptationEngine({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2,
  glossary: {
    'AI': 'IA',
    'machine learning': 'aprendizaje automático'
  }
});

// Build prompt for a segment
const prompt = engine.buildPrompt(segment, attempt, previousFeedback);

// Validate translation heuristically
const result = engine.validateHeuristic(originalText, translatedText, duration);
```

### 4. Gemini Client

**Location:** `packages/backend/src/lib/gemini-client.ts`

Wrapper for Google's Gemini API.

**Features:**
- Gemini Pro for translation (higher quality)
- Gemini Flash for validation (faster, cheaper)
- Rate limiting handling
- Comprehensive logging

**Usage:**
```typescript
import { getGeminiClient } from './lib/gemini-client';

const client = getGeminiClient();

// Generate translation
const translation = await client.translate(prompt);

// Validate with LLM-as-Judge
const validationResponse = await client.validate(validationPrompt);
```

**Environment Variables:**
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 5. Translation Validator

**Location:** `packages/backend/src/lib/translation-validator.ts`

Validates translations using heuristic checks and LLM-as-Judge.

**Validation Steps:**
1. **Heuristic Validation** (fast, cheap)
   - Character count ratio (0.5x to 1.5x)
   - Words per second (1-4 wps)

2. **LLM-as-Judge Validation** (slower, more accurate)
   - Natural speech test using Gemini Flash
   - Returns YES or NO

**Usage:**
```typescript
import { TranslationValidator } from './lib/translation-validator';

const validator = new TranslationValidator(geminiClient, adaptationEngine);

const result = await validator.validate(
  originalText,
  translatedText,
  duration,
  targetLanguage
);

if (result.isValid) {
  console.log('Translation passed validation');
} else {
  console.log(`Validation failed: ${result.feedback}`);
}
```

### 6. Adaptation Service

**Location:** `packages/backend/src/lib/adaptation-service.ts`

Orchestrates the complete adaptation process with retry logic.

**Features:**
- Retry loop with max 2 attempts
- Feedback-enhanced prompts on retry
- Parallel processing with concurrency control
- Summary statistics and reporting

**Usage:**
```typescript
import { createAdaptationService } from './lib/adaptation-service';

const service = createAdaptationService({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2,
  glossary: { 'AI': 'IA' }
});

// Adapt a single segment
const result = await service.adaptSegment(segment);

// Adapt multiple segments in parallel
const results = await service.adaptSegmentsParallel(segments, 3);

// Get statistics
const stats = service.getAdaptationStats(results);
console.log(`Success rate: ${stats.successRate}%`);
```

### 7. Adaptation Worker

**Location:** `packages/workers/src/adaptation-worker.ts`

BullMQ worker that processes adaptation jobs.

**Job Data:**
```typescript
interface AdaptationJobData {
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
  concurrency?: number;
}
```

**Workflow:**
1. Load Context Map from project
2. Filter segments that need adaptation
3. Create adaptation service with configuration
4. Test Gemini API connection
5. Adapt segments in parallel
6. Update Context Map with results
7. Generate summary report

## Retry Logic

The adaptation engine implements intelligent retry logic with feedback:

```
Attempt 1: Generate translation → Validate
           ↓ (if failed)
Attempt 2: Generate with feedback → Validate
           ↓ (if failed)
Attempt 3: Generate with enhanced feedback → Validate
           ↓ (if failed)
Mark as failed_adaptation
```

**Feedback Examples:**
- "too long (character count exceeds 150% of original)"
- "too short (character count below 50% of original)"
- "too long (would require speaking too fast)"
- "failed natural speech test (LLM-as-Judge)"

## Prompt Structure

### Translation Prompt

```
You are a professional translator specializing in timing-aware dubbing.

Here are examples of excellent timing-aware translations:

Original (3.5s, happy): "Hello everyone, welcome to my channel."
Translation: "Hola a todos, bienvenidos a mi canal."

[More examples...]

Custom glossary terms (use these exact translations):
- "AI" → "IA"
- "machine learning" → "aprendizaje automático"

Context:
Previous line: "Let me introduce myself."
Current line (3.7s, neutral): "Today we're going to talk about AI dubbing."
Next line: "This technology is amazing."

IMPORTANT: Your previous translation was too long. Please be more concise while strictly adhering to the 3.7s time limit.

Translate the current line to Spanish, ensuring it can be spoken naturally in 3.7 seconds while preserving the neutral emotion.

IMPORTANT RULES:
1. The translation MUST fit within the time constraint
2. Maintain natural speech rhythm and flow
3. Preserve the emotional tone
4. Keep the meaning accurate
5. Return ONLY the translated text, no explanations
```

### Validation Prompt (LLM-as-Judge)

```
You are a speech timing expert. Evaluate if this Spanish text can be spoken naturally in 3.7 seconds.

Original: "Today we're going to talk about AI dubbing."
Translation: "Hoy vamos a hablar sobre doblaje con IA."
Time limit: 3.7 seconds

Consider:
1. Natural speech pace (typically 2-3 words per second)
2. Pauses and breathing
3. Emotional delivery requirements

Answer with ONLY "YES" if it fits naturally, or "NO" if it's too long or too short.
```

## Integration with Context Map

The adaptation engine integrates seamlessly with the Context Map system:

**Before Adaptation:**
```json
{
  "id": 0,
  "start_ms": 0,
  "end_ms": 3500,
  "duration": 3.5,
  "text": "Hello everyone, welcome to my channel.",
  "speaker": "SPEAKER_00",
  "emotion": "happy",
  "previous_line": null,
  "next_line": "Today we're going to talk about...",
  "status": "pending"
}
```

**After Adaptation:**
```json
{
  "id": 0,
  "start_ms": 0,
  "end_ms": 3500,
  "duration": 3.5,
  "text": "Hello everyone, welcome to my channel.",
  "speaker": "SPEAKER_00",
  "emotion": "happy",
  "previous_line": null,
  "next_line": "Today we're going to talk about...",
  "adapted_text": "Hola a todos, bienvenidos a mi canal.",
  "status": "success",
  "attempts": 1,
  "validation_feedback": "passed LLM-as-Judge validation"
}
```

## API Endpoints

### Trigger Adaptation Job

```http
POST /api/projects/:projectId/adapt
Content-Type: application/json

{
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "glossary": {
    "AI": "IA"
  },
  "concurrency": 3
}
```

**Response:**
```json
{
  "jobId": "adaptation-job-123",
  "status": "queued"
}
```

### Get Adaptation Status

```http
GET /api/projects/:projectId/adaptation-status
```

**Response:**
```json
{
  "status": "completed",
  "summary": "=== Adaptation Summary ===\n\nTotal segments: 10\nSuccessful: 9 (90.0%)\nFailed: 1\nAverage attempts: 1.2\n",
  "stats": {
    "total": 10,
    "successful": 9,
    "failed": 1,
    "successRate": 90.0,
    "averageAttempts": 1.2
  }
}
```

## Performance Considerations

### Cost Optimization

- **Gemini Pro**: Used for translation (~$0.00025 per 1K characters)
- **Gemini Flash**: Used for validation (~$0.000075 per 1K characters)
- **Heuristic Validation**: Free, runs before LLM validation

**Estimated Cost per Segment:**
- Translation: $0.0003 (average 1.2K characters)
- Validation: $0.00005 (average 0.7K characters)
- **Total: ~$0.00035 per segment**

For a 10-minute video with 100 segments: **~$0.035**

### Latency

- **Heuristic Validation**: <1ms
- **Gemini Flash Validation**: ~500ms
- **Gemini Pro Translation**: ~1-2s
- **Total per segment**: ~2-3s (with 1 attempt)

With parallel processing (concurrency=3):
- 100 segments: ~70-100 seconds

### Rate Limits

Gemini API rate limits (as of 2024):
- **Gemini Pro**: 60 requests per minute
- **Gemini Flash**: 1000 requests per minute

The worker respects these limits with built-in retry logic.

## Testing

### Unit Tests

```bash
npm test -- adaptation-engine.test.ts
npm test -- translation-validator.test.ts
npm test -- gemini-client.test.ts
```

### Integration Tests

```bash
npm test -- adaptation-service.test.ts
npm test -- adaptation-worker.test.ts
```

### Manual Testing

```typescript
// Test API connection
const service = createAdaptationService({
  sourceLanguage: 'en',
  targetLanguage: 'es',
  maxRetries: 2
});

const isConnected = await service.testConnection();
console.log('API connected:', isConnected);

// Test single segment adaptation
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
  next_line: "Today we're going to talk about AI."
};

const result = await service.adaptSegment(testSegment);
console.log('Result:', result);
```

## Troubleshooting

### Common Issues

**1. "GEMINI_API_KEY environment variable is not set"**
- Solution: Add `GEMINI_API_KEY=your-key` to `.env` file

**2. "Rate limit exceeded"**
- Solution: Reduce concurrency or wait before retrying
- The system automatically handles rate limits with exponential backoff

**3. "No few-shot examples found for language pair"**
- Solution: Add examples to `few-shot-examples.json` for that language pair
- The system will still work but may have lower quality

**4. "All segments failed adaptation"**
- Check Gemini API key is valid
- Check API quota/billing
- Review logs for specific error messages

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

View LLM interactions:
```typescript
// All LLM calls are logged with:
// - Prompt preview
// - Response preview
// - Duration
// - Token usage
```

## Future Enhancements

1. **Support for more language pairs**
   - Add few-shot examples for additional languages
   - Support for right-to-left languages (Arabic, Hebrew)

2. **Advanced validation**
   - Phonetic analysis for pronunciation difficulty
   - Semantic similarity scoring
   - Cultural appropriateness checks

3. **Adaptive retry strategies**
   - Learn from successful adaptations
   - Adjust temperature based on segment difficulty
   - Use different models for different languages

4. **Caching and optimization**
   - Cache successful translations for similar segments
   - Batch API calls for better throughput
   - Use streaming for real-time feedback

5. **Quality metrics**
   - Track adaptation quality over time
   - A/B test different prompt strategies
   - Collect user feedback on translations

## References

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Few-Shot Learning](https://en.wikipedia.org/wiki/Few-shot_learning)
- [LLM-as-Judge Pattern](https://arxiv.org/abs/2306.05685)
- [Timing-Aware Translation](https://aclanthology.org/2021.eacl-main.159/)
