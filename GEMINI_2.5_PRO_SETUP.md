# Gemini 2.5 Pro Configuration

The adaptation engine now uses **Gemini 2.5 Pro** for intelligent translation adaptation.

## What Changed

All translation adaptation and validation now uses Google's latest Gemini 2.5 Pro model for:
- Higher quality translations
- Better context understanding
- More accurate timing-aware adaptations
- Improved cultural nuance handling

## Configuration

The model is configured via environment variables:

```bash
# In packages/backend/.env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-pro
```

## Model Options

You can switch between models by changing the `GEMINI_MODEL` variable:

- `gemini-2.5-pro` - Latest and most capable (recommended for production)
- `gemini-2.0-flash-exp` - Faster, experimental
- `gemini-1.5-pro` - Previous generation, still very capable
- `gemini-1.5-flash` - Faster, lower cost option

## Usage in Code

The Gemini client automatically uses the configured model:

```typescript
import { getGeminiClient } from './lib/gemini-client';

const client = getGeminiClient();

// Translation uses gemini-2.5-pro
const translation = await client.translate(prompt);

// Validation also uses gemini-2.5-pro
const validation = await client.validate(validationPrompt);
```

## Benefits of Gemini 2.5 Pro

1. **Better Context Understanding**: Improved ability to maintain context across dialogue
2. **Timing Awareness**: More accurate estimation of speech duration
3. **Cultural Adaptation**: Better handling of idioms and cultural references
4. **Consistency**: More consistent translations across segments
5. **Emotion Preservation**: Better at maintaining emotional tone

## Cost Considerations

Gemini 2.5 Pro pricing (as of Nov 2024):
- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens

For cost optimization, you can:
- Use `gemini-2.0-flash-exp` for development/testing
- Use `gemini-2.5-pro` for production
- Implement caching for repeated translations

## Testing

Test the configuration:

```bash
cd packages/backend
npm run test:cli
```

Or use the test script:

```bash
node test-cli-dubbing.ts
```

## Monitoring

The system logs all Gemini API interactions including:
- Model used
- Token usage
- Response time
- Validation results

Check logs for performance metrics:

```bash
# View recent logs
tail -f packages/backend/logs/app.log
```

## Troubleshooting

### API Key Issues
```
Error: GEMINI_API_KEY environment variable is not set
```
Solution: Add your API key to `packages/backend/.env`

### Model Not Found
```
Error: Gemini API error: 404 - Model not found
```
Solution: Ensure you're using a valid model name. Check available models at:
https://ai.google.dev/models/gemini

### Rate Limiting
```
Error: Rate limit exceeded
```
Solution: The system automatically handles rate limits with exponential backoff. If persistent, consider:
- Reducing concurrency in adaptation service
- Upgrading your Gemini API quota
- Using a faster model for non-critical translations

## Next Steps

1. Verify your API key is set correctly
2. Test with a sample video
3. Monitor token usage and costs
4. Adjust model based on quality/cost tradeoffs
5. Consider implementing translation caching for repeated content
