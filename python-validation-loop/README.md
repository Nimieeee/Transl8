# Audio Duration Validation & Retry Loop

Python module for AI dubbing with automatic duration validation and retry logic.

## Features

- ✅ **Smart LLM Adaptation**: Uses Mistral AI to adapt translations to target duration
- ✅ **Syllable Estimation**: Calculates target syllable count (3-4 per second)
- ✅ **OpenAI TTS**: High-quality cloud-based text-to-speech
- ✅ **Duration Validation**: Measures actual audio duration with librosa
- ✅ **Feedback Loop**: Automatically retries with specific feedback
- ✅ **Tolerance Window**: ±15% duration tolerance (configurable)
- ✅ **Max Retries**: Hard limit of 3 attempts (configurable)
- ✅ **Multiple Voices**: 6 OpenAI TTS voices to choose from

## Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Install Fish Audio (follow their instructions)
# https://github.com/fishaudio/fish-speech
```

## Setup

```bash
# Set API keys
export MISTRAL_API_KEY="your-mistral-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

Get API keys:
- **Mistral AI**: https://console.mistral.ai/
- **OpenAI**: https://platform.openai.com/api-keys

## Usage

```python
from adapt_and_validate import DubbingValidator

# Initialize validator
validator = DubbingValidator(
    tolerance=0.15,  # ±15% duration tolerance
    max_retries=3,   # Maximum 3 attempts
    tts_voice='alloy',  # OpenAI TTS voice
    mistral_model='mistral-small-latest'  # Mistral model
)

# Adapt and validate a line
audio_path, duration, attempts = validator.adapt_and_validate_line(
    text="Hello, how are you doing today?",
    target_duration=2.5,  # seconds
    target_language='Spanish',
    output_dir="./output"
)

print(f"Generated: {audio_path}")
print(f"Duration: {duration:.2f}s")
print(f"Attempts: {attempts}")
```

### Available OpenAI TTS Voices:
- `alloy` - Neutral, balanced
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep, authoritative
- `nova` - Female, energetic
- `shimmer` - Soft, warm

## How It Works

### 1. Initial Adaptation (Smart Guess)
- Analyzes target duration (e.g., 2.5s)
- Estimates syllable count (3.5 syllables/second)
- Prompts Mistral AI to translate with syllable constraint

### 2. Generation (Test)
- Generates audio with OpenAI TTS
- Uses selected voice (alloy, echo, fable, etc.)
- Cloud-based, no local setup required

### 3. Validation (Check)
- Measures actual duration with librosa
- Compares to target duration
- Checks if within ±15% tolerance
- If valid → Return audio
- If invalid → Proceed to retry

### 4. Feedback Loop (Retry)
- **Too short**: "Add filler words, be more verbose"
- **Too long**: "Condense, remove fillers, use shorter synonyms"
- Maximum 3 retries
- Returns best attempt if all fail

## Configuration

```python
validator = DubbingValidator(
    tolerance=0.20,  # ±20% tolerance
    max_retries=5,   # 5 attempts max
    tts_voice='nova',  # Change voice
    mistral_model='mistral-medium-latest'  # Use larger model
)
```

### Mistral Models:
- `mistral-small-latest` - Fast, cost-effective (recommended)
- `mistral-medium-latest` - Better quality, slower
- `mistral-large-latest` - Best quality, most expensive

## Example Output

```
============================================================
ATTEMPT 1/3
============================================================
Attempt 1: Requesting LLM adaptation...
LLM returned: Hola, ¿cómo estás hoy?
Generating audio with Fish Audio (MPS)...
Audio generated: ./output/attempt_1_1234567890.wav
Measured duration: 2.1s
Validation: 2.10s vs 2.50s (tolerance: ±0.38s) - FAIL
❌ Failed validation. Retrying with feedback...

============================================================
ATTEMPT 2/3
============================================================
Attempt 2: Requesting Mistral AI adaptation...
Mistral AI returned: Hola, ¿cómo estás tú hoy día?
Generating audio with OpenAI TTS (voice: alloy)...
Audio generated: ./output/attempt_2_1234567891.mp3
Measured duration: 2.45s
Validation: 2.45s vs 2.50s (tolerance: ±0.38s) - PASS
✅ SUCCESS on attempt 2!

============================================================
FINAL RESULT:
Audio Path: ./output/attempt_2_1234567891.mp3
Duration: 2.45s (target: 2.50s)
Attempts: 2
============================================================
```

## Integration with Your Pipeline

To integrate this into your existing TypeScript pipeline, you can:

1. **Call as subprocess**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function validateAudio(text: string, duration: number) {
  const result = await execAsync(
    `python adapt_and_validate.py "${text}" ${duration}`
  );
  return JSON.parse(result.stdout);
}
```

2. **Use as microservice**:
- Run Python script as Flask/FastAPI service
- Call from TypeScript via HTTP

3. **Replace TTS worker**:
- Use this Python module instead of OpenAI TTS
- Better duration control
- Local processing (no API costs)

## Advantages Over Current Pipeline

| Feature | Current Pipeline | With Validation Loop |
|---------|-----------------|---------------------|
| Duration Control | ❌ No control | ✅ Validated ±15% |
| Retry Logic | ❌ None | ✅ Up to 3 attempts |
| Feedback | ❌ None | ✅ Specific guidance |
| LLM | Mistral AI | Mistral AI |
| TTS | OpenAI | OpenAI |
| Cost | 💰 API costs | 💰 API costs (more calls) |
| Latency | ⚡ Fast | 🐢 Slower (retries) |
| Quality | ✅ High | ✅ Duration-matched |

## Troubleshooting

### Mistral AI API errors
```bash
# Check API key
echo $MISTRAL_API_KEY

# Test API
python -c "from mistralai import Mistral; client = Mistral(api_key='your-key'); print('OK')"
```

### OpenAI API errors
```bash
# Check API key
echo $OPENAI_API_KEY

# Test API
python -c "from openai import OpenAI; client = OpenAI(api_key='your-key'); print('OK')"
```

### Rate limiting
Both APIs have rate limits:
- **Mistral Free Tier**: 1 request/second
- **OpenAI**: Varies by tier

The script includes automatic retry logic for rate limits.

## License

MIT
