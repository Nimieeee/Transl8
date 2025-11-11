# Quick Start: Ultimate AI Dubbing

## 🚀 Get Started in 3 Steps

### Step 1: Setup (One-time, ~10 minutes)

```bash
./SETUP_ULTIMATE_DUBBING.sh
```

This installs:
- XTTS v2 for voice cloning
- DTW for timing alignment  
- Wav2Lip for lip-sync
- All dependencies and models

### Step 2: Start Services

```bash
./START_ULTIMATE_DUBBING.sh
```

This starts 3 services:
- **XTTS v2**: http://localhost:8009 (voice cloning)
- **DTW**: http://localhost:8010 (timing alignment)
- **Wav2Lip**: http://localhost:8008 (lip-sync)

### Step 3: Test Your Video

```bash
./test-ultimate-dubbing.sh
```

This will:
1. Upload your video
2. Clone your voice
3. Apply intelligent timing
4. Generate perfect lip-sync
5. Download the result

## What You Get

✅ **Your voice** in the target language (not a generic voice)
✅ **Natural timing** that matches the original rhythm
✅ **Perfect lip-sync** where lips match the audio exactly
✅ **Professional quality** suitable for production use

## Processing Time

- **Short video (30s)**: ~2-4 minutes
- **Medium video (2min)**: ~10-16 minutes  
- **Long video (5min)**: ~25-40 minutes

Processing is ~5-8x the video duration.

## System Requirements

- **M1 Mac** (optimized for Apple Silicon)
- **8GB+ RAM** (12GB recommended)
- **10GB disk space** (for models)
- **Python 3.8+**

## Troubleshooting

### Services won't start?

```bash
# Check if ports are in use
lsof -i :8008 -i :8009 -i :8010

# Kill conflicting processes
kill -9 <PID>
```

### Out of memory?

Reduce batch sizes in service configs or close other applications.

### Slow processing?

First run downloads models (~2GB). Subsequent runs are much faster.

## Architecture

```
Your Video
    ↓
[Whisper] → Transcribe with word timestamps
    ↓
[GPT-4] → Translate naturally
    ↓
[XTTS v2] → Clone your voice (M1 GPU)
    ↓
[DTW] → Align timing intelligently
    ↓
[Wav2Lip] → Perfect lip-sync (M1 GPU)
    ↓
Professional Dubbed Video
```

## Next Steps

Once you've tested successfully:

1. **Adjust languages**: Edit `test-ultimate-dubbing.sh`
2. **Batch process**: Create a loop for multiple videos
3. **Fine-tune**: Adjust DTW parameters for your use case
4. **Deploy**: Use the services in your production pipeline

## Support

- Check `ULTIMATE_SETUP_STATUS.md` for setup progress
- View service logs for debugging
- Test individual services with curl

Enjoy professional-quality AI dubbing! 🎬
