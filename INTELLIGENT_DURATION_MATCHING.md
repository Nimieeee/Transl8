# Intelligent Duration Matching

## Problem
OpenAI TTS generates audio that's often shorter than the original video segment, causing:
- Audio finishing before video ends
- Poor lip-sync
- Awkward silence at the end

## Intelligent Solution

Instead of post-processing with tempo changes (which sound robotic), we use **OpenAI TTS's built-in speed parameter** with intelligent calculation.

### How It Works

1. **Estimate Speech Duration**
   ```typescript
   // Based on language-specific speaking rates
   const speakingRates = {
     'en': 150, // words per minute
     'es': 180, // Spanish is faster
     'fr': 160,
     // ... more languages
   };
   
   const wordCount = text.split(/\s+/).length;
   const estimatedDuration = (wordCount / wpm) * 60;
   ```

2. **Calculate Speed Ratio**
   ```typescript
   const targetDuration = segment.end - segment.start; // From original video
   const estimatedDuration = estimateSpeechDuration(translatedText);
   const speedRatio = estimatedDuration / targetDuration;
   ```

3. **Apply Natural Speed Adjustment**
   ```typescript
   // Clamp to natural range (0.5x to 1.5x)
   const speed = Math.max(0.5, Math.min(1.5, speedRatio));
   
   // Use OpenAI TTS speed parameter
   await tts.synthesize(text, voice, speed);
   ```

## Benefits

✅ **Natural Sounding** - Uses TTS engine's native speed control
✅ **Maintains Prosody** - Pitch and intonation stay natural
✅ **Language Aware** - Accounts for different speaking rates
✅ **No Post-Processing** - Done during synthesis
✅ **Better Quality** - No audio artifacts from time-stretching

## Example

**Original Video**: 19.88 seconds
**Spanish Translation**: "Hola chicos, soy Tolu..." (25 words)

**Calculation**:
- Spanish speaking rate: 180 wpm
- Estimated duration: (25 / 180) * 60 = 8.33 seconds
- Speed ratio: 8.33 / 19.88 = 0.42x
- Applied speed: 0.5x (clamped to minimum)

**Result**: Audio will be ~16-17 seconds instead of 10 seconds

## Language-Specific Speaking Rates

| Language | WPM | Notes |
|----------|-----|-------|
| English | 150 | Standard rate |
| Spanish | 180 | Faster than English |
| French | 160 | Moderate |
| Portuguese | 170 | Similar to Spanish |
| Japanese | 200 | Syllable-based |
| Korean | 190 | Fast |
| Swahili | 150 | Standard |

## Limitations

- **Speed Range**: OpenAI TTS supports 0.25x to 4.0x, but we limit to 0.5x-1.5x for natural sound
- **Estimation Accuracy**: Word count is approximate; actual duration varies by speaker
- **Very Short Segments**: May still have slight mismatches

## Future Improvements

1. **Iterative Refinement**: Measure actual TTS duration and adjust
2. **Pause Insertion**: Add strategic pauses between sentences
3. **Character Count**: Use character count for more accurate estimation
4. **ML Model**: Train a model to predict TTS duration more accurately

## Comparison

| Method | Quality | Accuracy | Speed |
|--------|---------|----------|-------|
| **Intelligent Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Tempo Stretching | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Silence Padding | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Voice Cloning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## Testing

Run the pipeline again to see improved duration matching:
```bash
./test-mistral-fix.sh
```

Expected improvement: Duration mismatch reduced from 50% to ~15-20%
