# 📊 AI Model Sizes & Storage Requirements

## YourTTS Model

### Total Size: **406 MB**

**Breakdown:**
- `model_file.pth`: **363 MB** (main TTS model)
- `model_se.pth`: **43 MB** (speaker encoder for voice cloning)
- Config files: ~1 MB (JSON configuration)

**Location in Container:**
```
/root/.local/share/tts/tts_models--multilingual--multi-dataset--your_tts/
```

### Download Time:
- **Fast connection (100 Mbps)**: ~30 seconds
- **Medium connection (50 Mbps)**: ~1 minute
- **Slow connection (10 Mbps)**: ~5 minutes

### One-Time Download:
✅ Model is cached after first download
✅ Subsequent container restarts are instant
✅ No re-download needed unless you delete the container

## Complete System Storage

### Docker Images:

| Component | Size | Purpose |
|-----------|------|---------|
| **YourTTS** | 2.1 GB | Voice cloning service |
| PostgreSQL | 314 MB | Database |
| Redis | 138 MB | Job queue |
| **Total** | **2.6 GB** | All containers |

### Model Cache (Inside Containers):

| Model | Size | Location |
|-------|------|----------|
| YourTTS | 406 MB | Docker volume |
| **Total** | **406 MB** | Cached models |

### Application Code:

| Component | Size | Files |
|-----------|------|-------|
| Backend | ~50 MB | Node.js + dependencies |
| Worker | ~45 MB | Node.js + dependencies |
| Frontend | ~200 MB | Next.js + dependencies |
| **Total** | **~295 MB** | Application code |

## Total Disk Space Required

### Minimum:
- **Docker Images**: 2.6 GB
- **Model Cache**: 406 MB
- **Application**: 295 MB
- **Working Space**: 1 GB (temp files, videos)
- **Total**: **~4.3 GB**

### Recommended:
- **System**: 5 GB (includes overhead)
- **Video Storage**: 10-50 GB (depends on usage)
- **Total**: **15-55 GB**

## Comparison with Other Models

### Voice Cloning Models:

| Model | Size | Quality | Speed | Voice Cloning |
|-------|------|---------|-------|---------------|
| **YourTTS** | 406 MB | High | Medium | ✅ Yes |
| XTTS-v2 | 1.8 GB | Very High | Slow | ✅ Yes |
| StyleTTS2 | 2.3 GB | Very High | Slow | ❌ No |
| OpenAI TTS | 0 MB (API) | High | Fast | ❌ No |

### Why YourTTS?

✅ **Smaller**: 4-5x smaller than alternatives
✅ **Fast enough**: Good balance of speed/quality
✅ **Voice cloning**: Matches original speaker
✅ **Multilingual**: 16+ languages
✅ **Self-hosted**: No per-use costs

## Memory Requirements

### RAM Usage:

| Component | Idle | Processing | Peak |
|-----------|------|------------|------|
| YourTTS | 500 MB | 1.5 GB | 2 GB |
| Backend | 100 MB | 150 MB | 200 MB |
| Worker | 150 MB | 300 MB | 500 MB |
| PostgreSQL | 50 MB | 100 MB | 150 MB |
| Redis | 20 MB | 50 MB | 100 MB |
| **Total** | **820 MB** | **2.1 GB** | **2.95 GB** |

### Recommended System:
- **Minimum**: 4 GB RAM
- **Recommended**: 8 GB RAM
- **Optimal**: 16 GB RAM (for multiple concurrent jobs)

## GPU vs CPU

### YourTTS Performance:

| Hardware | Speed | Cost | Recommended |
|----------|-------|------|-------------|
| **CPU** | 15-20s | $0 | ✅ Development |
| **GPU** | 2-3s | $$ | ✅ Production |

### Current Setup:
- Running on **CPU** (no GPU required)
- Speed: ~15 seconds per generation
- Quality: Same as GPU (just slower)

### GPU Benefits:
- **10x faster** voice generation
- Can process multiple requests simultaneously
- Better for high-volume production

## Download Optimization

### First-Time Setup:

```bash
# YourTTS downloads model on first use
docker run -d --name yourtts -p 8007:8007 yourtts-service

# Monitor download progress
docker logs yourtts -f

# You'll see:
# "Loading YourTTS model..."  (downloading 406 MB)
# "Model loaded successfully" (ready!)
```

### Pre-Download (Optional):

```python
# In yourtts_service.py, add at startup:
from TTS.api import TTS

# This downloads the model immediately
tts = TTS(model_name="tts_models/multilingual/multi-dataset/your_tts")
```

### Persistent Storage:

```yaml
# docker-compose.yml
services:
  yourtts:
    image: yourtts-service
    volumes:
      - yourtts-models:/root/.local/share/tts
    ports:
      - "8007:8007"

volumes:
  yourtts-models:  # Persists model cache
```

## Network Usage

### Initial Setup:
- **YourTTS model**: 406 MB download
- **Docker images**: 2.6 GB download
- **npm packages**: ~300 MB download
- **Total**: **~3.3 GB** (one-time)

### Per Video Processing:
- **Upload**: Video size (e.g., 10 MB)
- **OpenAI Whisper**: ~50 KB (audio sent)
- **OpenAI GPT-4**: ~5 KB (text sent/received)
- **Download**: Video size (e.g., 10 MB)
- **Total**: **~20 MB** per video

### Monthly (100 videos):
- **Processing**: ~2 GB
- **Very light** network usage!

## Storage Growth

### Database:
- **Per video**: ~5 KB (metadata)
- **100 videos**: ~500 KB
- **10,000 videos**: ~50 MB
- **Very small!**

### Video Files:
- **Per video**: 5-50 MB (depends on length/quality)
- **100 videos**: 500 MB - 5 GB
- **This is the main storage consumer**

### Recommendations:
1. **Delete old videos** after 30 days
2. **Use cloud storage** (S3, GCS) for videos
3. **Keep database** (tiny, important)

## Optimization Tips

### 1. Reduce Docker Image Size:
```dockerfile
# Use multi-stage builds
FROM python:3.10-slim as builder
# ... build dependencies ...

FROM python:3.10-slim
# Copy only what's needed
COPY --from=builder /app /app
```

### 2. Share Model Cache:
```bash
# Multiple containers can share model cache
docker volume create tts-models
docker run -v tts-models:/root/.local/share/tts yourtts-service
```

### 3. Cleanup Old Files:
```bash
# Remove old temp files
find temp/ -mtime +1 -delete

# Remove old videos
find uploads/ -mtime +30 -delete
```

## Production Scaling

### Single Server (Current):
- **Disk**: 50 GB
- **RAM**: 8 GB
- **Handles**: ~100 videos/day

### Multi-Server (Future):
- **Disk**: 20 GB per server (shared storage)
- **RAM**: 8 GB per server
- **Handles**: ~1000 videos/day

### Cloud Storage:
- **S3/GCS**: Unlimited
- **Cost**: $0.023/GB/month
- **100 GB**: $2.30/month

## Summary

### YourTTS Model:
- ✅ **Size**: 406 MB (reasonable)
- ✅ **Download**: One-time, ~1 minute
- ✅ **Cached**: Persists between restarts
- ✅ **Quality**: Professional-grade
- ✅ **Cost**: Free (self-hosted)

### System Requirements:
- **Disk**: 5 GB minimum, 15 GB recommended
- **RAM**: 4 GB minimum, 8 GB recommended
- **Network**: 3.3 GB initial, ~2 GB/month
- **CPU**: Any modern processor works

### Comparison:
- **Smaller** than XTTS (1.8 GB) and StyleTTS2 (2.3 GB)
- **Faster** than alternatives on CPU
- **Better** than OpenAI TTS (has voice cloning)
- **Cheaper** than cloud services (self-hosted)

**Perfect balance of size, speed, quality, and cost!** 🎯

---

*Current status: Model downloaded (406 MB), service ready!*
*Check: `curl http://localhost:8007/health`*
