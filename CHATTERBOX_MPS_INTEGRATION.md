# 🍎 Chatterbox with Apple Silicon (MPS) Integration

## Overview

This guide shows how to integrate **Chatterbox with Apple Silicon optimization** into your dubbing pipeline, giving you:

- 🚀 **3-5x faster inference** with MPS (Metal Performance Shaders)
- 🎤 **Zero-shot voice cloning** (maintain original speaker's voice)
- 🌍 **23 languages** supported
- 😊 **Emotion control** (exaggeration parameter)
- 💰 **Free** (self-hosted, no API costs)

## What's Special About This Version?

**Standard Chatterbox:**
- Runs on CPU only (slow on Mac)
- ~10-15 seconds per segment

**Apple Silicon Optimized (Jimmi42/chatterbox-tts-apple-silicon):**
- Runs on MPS (Metal GPU)
- ~2-4 seconds per segment
- **3-5x faster!**

## Quick Start (5 Minutes)

### Step 1: Setup (2 minutes)
```bash
./SETUP_CHATTERBOX_MPS.sh
```

This will:
- Create virtual environment
- Install PyTorch with MPS support
- Install Apple Silicon optimized Chatterbox
- Verify MPS is working

### Step 2: Start Service (30 seconds)
```bash
./START_CHATTERBOX.sh
```

You should see:
```
🚀 Using Apple Silicon MPS acceleration!
✅ Models loaded successfully on mps
📊 Sample rate: 24000 Hz
 * Running on http://0.0.0.0:5003
```

### Step 3: Test (30 seconds)
```bash
./test-chatterbox.sh
```

### Step 4: Integrate into Pipeline (2 minutes)

See "Full Integration" section below.

## Full Integration

### 1. Create Chatterbox Adapter

Create `packages/backend/src/adapters/chatterbox-adapter.ts`:

```typescript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { TTSAdapter, TTSResult, VoiceConfig } from './types';
import { logger } from '../lib/logger';

export interface ChatterboxConfig {
  serviceUrl?: string;
  defaultExaggeration?: number;
  defaultCfgWeight?: number;
}

export class ChatterboxAdapter implements TTSAdapter {
  private serviceUrl: string;
  private defaultExaggeration: number;
  private defaultCfgWeight: number;

  constructor(config: ChatterboxConfig = {}) {
    this.serviceUrl = config.serviceUrl || process.env.CHATTERBOX_SERVICE_URL || 'http://localhost:5003';
    this.defaultExaggeration = config.defaultExaggeration || 0.5;
    this.defaultCfgWeight = config.defaultCfgWeight || 0.5;
  }

  async synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    targetLanguage: string,
    segmentDuration?: number
  ): Promise<TTSResult> {
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', this.mapLanguageCode(targetLanguage));
      
      // Add voice cloning if reference audio provided
      if (voiceConfig.referenceAudio && fs.existsSync(voiceConfig.referenceAudio)) {
        logger.info(`Using voice cloning with reference: ${voiceConfig.referenceAudio}`);
        formData.append('audio_prompt', fs.createReadStream(voiceConfig.referenceAudio));
      }
      
      // Add emotion control
      const exaggeration = this.mapEmotionToExaggeration(voiceConfig.emotion);
      formData.append('exaggeration', exaggeration.toString());
      formData.append('cfg_weight', this.defaultCfgWeight.toString());

      logger.debug(`Synthesizing with Chatterbox: "${text.substring(0, 50)}..." (${targetLanguage})`);

      const response = await axios.post(
        `${this.serviceUrl}/synthesize`,
        formData,
        { 
          headers: formData.getHeaders(),
          timeout: 60000 // 60 second timeout
        }
      );

      logger.info(`Chatterbox synthesis complete: ${response.data.duration}s`);

      return {
        audioPath: response.data.audio_path,
        duration: response.data.duration,
        sampleRate: response.data.sample_rate,
      };
    } catch (error) {
      logger.error('Chatterbox synthesis failed:', error);
      throw new Error(`Chatterbox synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, { timeout: 5000 });
      const isHealthy = response.data.status === 'healthy';
      
      if (isHealthy) {
        logger.info(`Chatterbox service healthy (device: ${response.data.device})`);
      }
      
      return isHealthy;
    } catch (error) {
      logger.error('Chatterbox health check failed:', error);
      return false;
    }
  }

  private mapLanguageCode(code: string): string {
    // Map common language codes to Chatterbox format
    const languageMap: Record<string, string> = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh',
      'ar': 'ar',
      'hi': 'hi',
      'ru': 'ru',
      'nl': 'nl',
      'pl': 'pl',
      'tr': 'tr',
      'sv': 'sv',
      'no': 'no',
      'da': 'da',
      'fi': 'fi',
      'el': 'el',
      'he': 'he',
      'ms': 'ms',
      'sw': 'sw',
    };
    
    return languageMap[code] || 'en';
  }

  private mapEmotionToExaggeration(emotion?: string): number {
    if (!emotion) return this.defaultExaggeration;
    
    const emotionMap: Record<string, number> = {
      'neutral': 0.3,
      'happy': 0.7,
      'sad': 0.6,
      'angry': 0.9,
      'excited': 0.8,
      'scared': 0.7,
      'surprised': 0.8,
      'calm': 0.4,
      'energetic': 0.9,
    };
    
    return emotionMap[emotion.toLowerCase()] || this.defaultExaggeration;
  }

  getSupportedLanguages(): string[] {
    return [
      'ar', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr',
      'he', 'hi', 'it', 'ja', 'ko', 'ms', 'nl', 'no',
      'pl', 'pt', 'ru', 'sv', 'sw', 'tr', 'zh'
    ];
  }
}
```

### 2. Update TTS Worker

Modify `packages/workers/src/tts-worker.ts`:

```typescript
// At the top, add import
import { ChatterboxAdapter } from '../../backend/src/adapters/chatterbox-adapter';
import { OpenAITTSAdapter } from '../../backend/src/adapters/openai-tts-adapter';

// In the constructor, replace OpenAI TTS with Chatterbox:
constructor(redisConnection: any) {
  this.redisConnection = redisConnection;

  // Use Chatterbox with Apple Silicon optimization
  const useChatterbox = process.env.USE_CHATTERBOX === 'true';
  
  if (useChatterbox) {
    logger.info('🍎 Using Chatterbox TTS with Apple Silicon optimization');
    this.ttsAdapter = new ChatterboxAdapter({
      serviceUrl: process.env.CHATTERBOX_SERVICE_URL || 'http://localhost:5003',
      defaultExaggeration: 0.5,
      defaultCfgWeight: 0.5,
    });
  } else {
    logger.info('Using OpenAI TTS');
    this.ttsAdapter = new OpenAITTSAdapter({
      model: 'tts-1',
      defaultVoice: 'alloy',
    });
  }

  // ... rest of constructor
}
```

### 3. Add Environment Variables

Add to `packages/backend/.env`:

```bash
# Chatterbox TTS with Apple Silicon optimization
USE_CHATTERBOX=true
CHATTERBOX_SERVICE_URL=http://localhost:5003
```

### 4. Extract Voice for Cloning (Optional)

To use voice cloning, extract the original speaker's voice:

```typescript
// In your STT worker or preprocessing step
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function extractVoiceSample(videoPath: string, outputPath: string): Promise<string> {
  // Extract first 10 seconds of audio as voice sample
  await execAsync(
    `ffmpeg -i "${videoPath}" -t 10 -vn -acodec pcm_s16le -ar 24000 -ac 1 "${outputPath}"`
  );
  return outputPath;
}

// Use in STT worker after transcription:
const voiceSamplePath = path.join(tempDir, 'voice_sample.wav');
await extractVoiceSample(videoPath, voiceSamplePath);

// Store path in database for TTS worker to use
await prisma.project.update({
  where: { id: projectId },
  data: { voiceSamplePath }
});
```

### 5. Restart Services

```bash
# Stop current services (Ctrl+C in terminals)

# Start Chatterbox
./START_CHATTERBOX.sh

# Start workers
cd packages/workers && npm run dev

# Start backend
cd packages/backend && npm run dev
```

## Performance Comparison

### OpenAI TTS
- Speed: ~1-2 seconds per segment (API latency)
- Cost: $15 per 1M characters
- Voice cloning: ❌ No
- Quality: Excellent
- Setup: Simple (API key only)

### Chatterbox (CPU)
- Speed: ~10-15 seconds per segment
- Cost: Free
- Voice cloning: ✅ Yes
- Quality: Very good
- Setup: Moderate

### Chatterbox (Apple Silicon MPS)
- Speed: ~2-4 seconds per segment ⚡
- Cost: Free
- Voice cloning: ✅ Yes
- Quality: Very good
- Setup: Moderate
- **3-5x faster than CPU!**

## Testing

### Test Chatterbox Service
```bash
curl http://localhost:5003/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "chatterbox-opensource",
  "device": "mps",
  "languages": 23
}
```

### Test Synthesis
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hello, this is a test of voice synthesis." \
  -F "language=en"
```

### Test with Voice Cloning
```bash
curl -X POST http://localhost:5003/synthesize \
  -F "text=Hello, this is a test with voice cloning." \
  -F "language=en" \
  -F "audio_prompt=@path/to/voice_sample.wav"
```

### Test Full Pipeline
```bash
./test-mistral-fix.sh
```

Watch for logs showing Chatterbox usage:
```
🍎 Using Chatterbox TTS with Apple Silicon optimization
Synthesizing with Chatterbox: "Hola a todos..." (es)
Chatterbox synthesis complete: 3.2s
```

## Monitoring

### Check MPS Usage
```bash
# In another terminal while synthesis is running
sudo powermetrics --samplers gpu_power -i 1000 -n 1
```

You should see GPU activity during synthesis.

### Check Service Logs
```bash
# In the terminal running START_CHATTERBOX.sh
# You'll see:
# 🚀 Using Apple Silicon MPS acceleration!
# Synthesizing: "..." in es
# Synthesis complete: torch.Size([1, 76800])
```

## Troubleshooting

### MPS Not Available
If you see "Using CPU" instead of "Using MPS":
```bash
python3 -c "import torch; print('MPS:', torch.backends.mps.is_available())"
```

If False, you may need to update PyTorch:
```bash
source venv_chatterbox/bin/activate
pip install --upgrade torch torchvision torchaudio
```

### Service Won't Start
Check if port 5003 is in use:
```bash
lsof -i :5003
```

Kill existing process or change port in service.

### Slow Performance
- Ensure MPS is being used (check logs for "mps" device)
- Close other GPU-intensive apps
- Check Activity Monitor for GPU usage

## Benefits of This Integration

### 1. Voice Cloning
Maintain the original speaker's voice across languages:
```
Original (English): Speaker's natural voice
Dubbed (Spanish): Same voice characteristics!
```

### 2. Cost Savings
For a 10-minute video:
- OpenAI TTS: ~$0.36
- Chatterbox: $0.00 (free!)

At scale (1000 videos/month):
- OpenAI TTS: ~$360/month
- Chatterbox: $0/month
- **Savings: $360/month**

### 3. Speed
With Apple Silicon MPS:
- 10-minute video = ~60 segments
- 60 segments × 3 seconds = 180 seconds (3 minutes)
- **Much faster than CPU!**

### 4. Privacy
- All processing happens locally
- No data sent to external APIs
- Full control over your content

### 5. Emotion Control
Fine-tune emotional intensity:
```typescript
// Calm narration
exaggeration: 0.3

// Excited announcement
exaggeration: 0.9

// Natural conversation
exaggeration: 0.5
```

## Next Steps

1. ✅ Run setup script
2. ✅ Start service
3. ✅ Test synthesis
4. ✅ Integrate into pipeline
5. 🔄 Test with real videos
6. 🔄 Monitor performance
7. 🔄 Compare quality with OpenAI TTS
8. 🔄 Decide which to use as default

## Conclusion

The Apple Silicon optimized Chatterbox gives you:
- **3-5x faster** inference than CPU
- **Zero-shot voice cloning**
- **Free** (no API costs)
- **23 languages**
- **Emotion control**

Perfect for production dubbing with voice preservation! 🚀🍎
