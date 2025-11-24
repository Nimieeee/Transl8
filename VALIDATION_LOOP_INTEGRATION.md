# Validation Loop Integration Guide

## Current Status

The Python validation loop (`python-validation-loop/adapt_and_validate.py`) is implemented but **not yet integrated** into the main pipeline.

## What's Working Now

The translation worker now uses **duration-aware prompting**:
- Extracts duration information from transcript segments
- Instructs Mistral AI to match original timing
- Uses better prompts for natural, conversational translations
- Preserves emotional tone and adapts cultural references

## Why Validation Loop Isn't Integrated Yet

The validation loop requires:
1. **Python runtime** in the worker environment
2. **librosa** library for audio duration measurement
3. **Iterative TTS generation** (multiple API calls per segment)
4. **Increased processing time** (3x retries per segment)
5. **Higher API costs** (multiple TTS calls per segment)

## Current Translation Quality Issues

If you're hearing English in the translation, it's because:
1. **Mistral AI is returning mixed content** - The LLM sometimes includes English explanations
2. **JSON structure not enforced** - Need stricter validation
3. **No post-processing** - Need to extract only the translated text

## Quick Fix: Improve Translation Quality

### Option 1: Better Prompt Engineering (Implemented)
✅ Added duration-aware context
✅ Emphasized natural, conversational language
✅ Instructed to avoid formal translations
✅ Added lip-sync timing requirements

### Option 2: Add Translation Validation (Recommended Next Step)

Add validation to ensure translation is clean:

```typescript
// After getting translation from Mistral
const translatedText = extractTranslatedText(translationContent);

// Validate: should not contain English if translating to Spanish
if (project.target_language !== 'en' && containsEnglish(translatedText)) {
  console.warn('Translation contains English, retrying...');
  // Retry with stricter prompt
}
```

### Option 3: Full Validation Loop Integration (Future)

To integrate the Python validation loop:

1. **Add Python to Docker image**:
```dockerfile
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install mistralai openai librosa
```

2. **Call Python script from worker**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// In translation worker
const { stdout } = await execAsync(
  `python3 python-validation-loop/adapt_and_validate.py "${text}" ${duration} ${targetLang}`
);
```

3. **Update render.yaml**:
```yaml
services:
  - type: web
    buildCommand: |
      npm install
      apt-get update && apt-get install -y python3 python3-pip
      pip3 install mistralai openai librosa
```

## Testing the Current Implementation

1. **Upload a video** with clear English speech
2. **Check the translation** in the database:
```sql
SELECT content FROM translations WHERE project_id = 'YOUR_PROJECT_ID';
```

3. **Listen to the output** - should be mostly in target language now

## Expected Behavior

With the improved prompts:
- ✅ Translation should be in target language
- ✅ Should maintain similar duration to original
- ✅ Should sound natural and conversational
- ⚠️ May still have minor timing mismatches (validation loop would fix this)

## Next Steps to Eliminate English

### Immediate (No code changes):
1. Use more specific prompts in Mistral
2. Add examples of good translations
3. Use temperature=0 for more consistent output

### Short-term (Small code changes):
1. Add post-processing to strip English
2. Validate translation language
3. Retry if English detected

### Long-term (Full integration):
1. Integrate Python validation loop
2. Add per-segment duration validation
3. Implement iterative refinement
4. Add quality metrics tracking

## Manual Testing of Validation Loop

You can test the validation loop manually:

```bash
cd python-validation-loop

# Set environment variables
export MISTRAL_API_KEY="your_key"
export OPENAI_API_KEY="your_key"

# Run validation
python3 adapt_and_validate.py
```

This will:
1. Translate "Hello, how are you doing today?"
2. Generate audio with OpenAI TTS
3. Measure duration with librosa
4. Retry up to 3 times if duration doesn't match
5. Save best attempt to `./dubbed_output/`

## Cost Considerations

**Current approach (duration-aware prompting):**
- 1 Mistral API call per project
- 1 OpenAI TTS call per project
- Fast processing (~5-10 seconds)
- Low cost (~$0.01 per project)

**Full validation loop:**
- 1-3 Mistral API calls per segment (retries)
- 1-3 OpenAI TTS calls per segment (retries)
- Slower processing (~30-60 seconds per segment)
- Higher cost (~$0.05-0.15 per project)

## Recommendation

For now, the **duration-aware prompting** should significantly improve translation quality. If you're still hearing English:

1. Check the translation in the database
2. Look for patterns (is it always at the start/end?)
3. We can add post-processing to strip English words
4. Or integrate the full validation loop if needed

The validation loop is ready to integrate when you need perfect timing and zero English leakage.
