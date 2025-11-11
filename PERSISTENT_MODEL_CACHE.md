# 💾 Persistent Model Cache - Never Download Again!

## Problem

**Currently:** Every time you rebuild the Docker image, the YourTTS model (406 MB) downloads again.
- ❌ Wastes 2-3 minutes
- ❌ Wastes bandwidth
- ❌ Annoying during development

## Solution: Docker Volumes

Use Docker volumes to persist the model cache outside the container.

## Quick Fix (Recommended)

### Use the New Startup Script:

```bash
./START_YOURTTS_PERSISTENT.sh
```

**What it does:**
1. Creates a named volume `yourtts-models` (once)
2. Mounts it to `/root/.local/share/tts` in container
3. Model downloads once, persists forever
4. Rebuilds are instant!

### Benefits:
- ✅ **First run**: Downloads model (2-3 min)
- ✅ **Every rebuild after**: Uses cached model (10 sec)
- ✅ **Survives container deletion**
- ✅ **Survives image rebuilds**
- ✅ **Easy to manage**

## Manual Setup

### Option 1: Named Volume (Best for Development)

```bash
# Create volume (once)
docker volume create yourtts-models

# Run container with volume
docker run -d \
    --name yourtts \
    -p 8007:8007 \
    -v yourtts-models:/root/.local/share/tts \
    yourtts-service
```

**Advantages:**
- Managed by Docker
- Easy to backup
- Portable across systems

**Manage the volume:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect yourtts-models

# Backup volume
docker run --rm -v yourtts-models:/data -v $(pwd):/backup \
    alpine tar czf /backup/yourtts-models-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v yourtts-models:/data -v $(pwd):/backup \
    alpine tar xzf /backup/yourtts-models-backup.tar.gz -C /data

# Delete volume (if needed)
docker volume rm yourtts-models
```

### Option 2: Bind Mount (Best for Debugging)

```bash
# Create local directory
mkdir -p ~/.yourtts-models

# Run container with bind mount
docker run -d \
    --name yourtts \
    -p 8007:8007 \
    -v ~/.yourtts-models:/root/.local/share/tts \
    yourtts-service
```

**Advantages:**
- Direct access to files
- Easy to inspect/debug
- Can manually add models

**Disadvantages:**
- Path-specific (not portable)
- Permission issues possible

### Option 3: docker-compose.yml

Add YourTTS to your docker-compose.yml:

```yaml
services:
  postgres:
    # ... existing config ...

  redis:
    # ... existing config ...

  yourtts:
    build: ./packages/workers/docker/yourtts
    container_name: yourtts
    ports:
      - "8007:8007"
    volumes:
      - yourtts_models:/root/.local/share/tts
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8007/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s

volumes:
  postgres_data:
  redis_data:
  yourtts_models:  # Add this
```

Then use:
```bash
# Start all services
docker-compose up -d

# Rebuild YourTTS (model persists!)
docker-compose up -d --build yourtts

# Stop all services
docker-compose down

# Stop and remove volumes (deletes cache)
docker-compose down -v
```

## Comparison

| Method | Ease of Use | Portability | Debugging | Best For |
|--------|-------------|-------------|-----------|----------|
| **Named Volume** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Production |
| **Bind Mount** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Development |
| **docker-compose** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Teams |

## Testing

### First Run (Downloads Model):
```bash
# Start with persistent cache
./START_YOURTTS_PERSISTENT.sh

# Wait 2-3 minutes for model download
# Check logs:
docker logs yourtts -f

# Should see:
# "Loading YourTTS model..."
# "YourTTS model loaded successfully"
```

### Rebuild (Uses Cache):
```bash
# Make a code change to yourtts_service.py

# Rebuild and restart
docker stop yourtts && docker rm yourtts
docker build -t yourtts-service packages/workers/docker/yourtts
docker run -d --name yourtts -p 8007:8007 \
    -v yourtts-models:/root/.local/share/tts \
    yourtts-service

# Ready in ~10 seconds! (no download)
```

### Verify Cache:
```bash
# Check cache size
docker exec yourtts du -sh /root/.local/share/tts

# Should show: 406M

# List cached files
docker exec yourtts ls -lh /root/.local/share/tts/tts_models--multilingual--multi-dataset--your_tts/

# Should show:
# model_file.pth (363M)
# model_se.pth (43M)
# config files
```

## Storage Impact

### Without Persistent Cache:
- **Image size**: 2.1 GB
- **Model in image**: No
- **Rebuild time**: 5 min (build) + 2 min (download) = 7 min
- **Disk usage**: 2.1 GB per image version

### With Persistent Cache:
- **Image size**: 2.1 GB
- **Model in volume**: 406 MB (shared)
- **Rebuild time**: 5 min (build) + 10 sec (load) = 5 min
- **Disk usage**: 2.1 GB + 406 MB (one-time)

**Savings per rebuild:** 2 minutes + bandwidth

## Advanced: Pre-download Model

Want to download the model during build instead of runtime?

### Update Dockerfile:

```dockerfile
# Add after installing TTS
RUN python -c "from TTS.api import TTS; TTS(model_name='tts_models/multilingual/multi-dataset/your_tts', progress_bar=True)"
```

**Pros:**
- Model in image
- No download on first run
- Faster container startup

**Cons:**
- Larger image (2.5 GB vs 2.1 GB)
- Slower builds (always downloads)
- Less flexible

**Recommendation:** Use volumes instead!

## Troubleshooting

### Volume Not Persisting:
```bash
# Check if volume exists
docker volume ls | grep yourtts

# If not, create it
docker volume create yourtts-models

# Verify mount
docker inspect yourtts | grep -A 10 Mounts
```

### Permission Issues:
```bash
# Fix permissions (if using bind mount)
sudo chown -R $(whoami) ~/.yourtts-models

# Or use named volume (no permission issues)
```

### Cache Corrupted:
```bash
# Delete and recreate
docker volume rm yourtts-models
docker volume create yourtts-models

# Restart container (will re-download)
docker restart yourtts
```

### Multiple Versions:
```bash
# Create version-specific volumes
docker volume create yourtts-models-v1
docker volume create yourtts-models-v2

# Use specific version
docker run -d --name yourtts \
    -v yourtts-models-v2:/root/.local/share/tts \
    yourtts-service
```

## Best Practices

### Development:
```bash
# Use named volume
./START_YOURTTS_PERSISTENT.sh

# Or docker-compose
docker-compose up -d yourtts
```

### Production:
```yaml
# docker-compose.yml with volume
services:
  yourtts:
    image: yourtts-service:latest
    volumes:
      - yourtts_models:/root/.local/share/tts
    restart: unless-stopped

volumes:
  yourtts_models:
    driver: local
```

### CI/CD:
```yaml
# .github/workflows/build.yml
- name: Cache YourTTS models
  uses: actions/cache@v3
  with:
    path: ~/.yourtts-models
    key: yourtts-models-v1
```

## Summary

### Current Workflow (Without Volumes):
```
Rebuild → Download 406 MB → Wait 2-3 min → Ready
Rebuild → Download 406 MB → Wait 2-3 min → Ready
Rebuild → Download 406 MB → Wait 2-3 min → Ready
```

### New Workflow (With Volumes):
```
First run → Download 406 MB → Wait 2-3 min → Ready
Rebuild → Use cache → Wait 10 sec → Ready ✅
Rebuild → Use cache → Wait 10 sec → Ready ✅
Rebuild → Use cache → Wait 10 sec → Ready ✅
```

**Time saved per rebuild:** 2-3 minutes
**Bandwidth saved:** 406 MB per rebuild
**Happiness gained:** Priceless! 😊

---

## Quick Start

**Just run this:**
```bash
./START_YOURTTS_PERSISTENT.sh
```

**That's it!** Model downloads once, persists forever. 🎉
