# 📦 Persistent Model Storage Guide

## How It Works

Both YourTTS and XTTS v2 use Docker volumes to persist downloaded models. This means:

✅ **Models download once** - Never re-download on rebuild
✅ **Fast restarts** - Models load from cache instantly
✅ **Survive rebuilds** - Docker image rebuilds don't affect models
✅ **Easy cleanup** - Delete volumes to free space

## Current Setup

### YourTTS Volume ✅
```bash
# Volume name: yourtts-models
# Container path: /root/.local/share/tts
# Size: ~500MB (YourTTS model)
```

### XTTS v2 Volume ✅
```bash
# Volume name: xtts-models
# Container path: /root/.local/share/tts
# Size: ~2GB (XTTS v2 model)
```

## How Volumes Work

### First Run:
```
1. Container starts
2. Checks /root/.local/share/tts (empty)
3. Downloads model (1.8GB for XTTS v2)
4. Saves to volume
5. Service ready
```

### Subsequent Runs:
```
1. Container starts
2. Checks /root/.local/share/tts (has model!)
3. Loads model from volume (fast!)
4. Service ready
```

### After Rebuild:
```
1. Rebuild Docker image
2. Start new container
3. Mount same volume
4. Model already there!
5. Service ready (no download)
```

## Verify Volumes

### List all volumes:
```bash
docker volume ls
```

Expected output:
```
DRIVER    VOLUME NAME
local     yourtts-models
local     xtts-models
```

### Inspect XTTS volume:
```bash
docker volume inspect xtts-models
```

### Check volume size:
```bash
docker system df -v | grep xtts-models
```

## Managing Volumes

### Keep models (recommended):
```bash
# Just restart container
docker restart xtts

# Or rebuild and restart
docker stop xtts
docker rm xtts
docker build -t xtts-service packages/workers/docker/xtts
./START_XTTS.sh  # Uses existing volume
```

### Delete models (free space):
```bash
# Stop container first
docker stop xtts
docker rm xtts

# Delete volume
docker volume rm xtts-models

# Next start will re-download
./START_XTTS.sh
```

### Backup models:
```bash
# Create backup
docker run --rm \
  -v xtts-models:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/xtts-models-backup.tar.gz -C /data .

# Restore backup
docker volume create xtts-models
docker run --rm \
  -v xtts-models:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/xtts-models-backup.tar.gz -C /data
```

## Storage Usage

### Current volumes:
```bash
# YourTTS
Volume: yourtts-models
Size: ~500MB
Model: YourTTS multilingual

# XTTS v2
Volume: xtts-models
Size: ~2GB
Model: XTTS v2 multilingual
```

### Total storage:
```
Docker images: ~6GB (CUDA base + dependencies)
Model volumes: ~2.5GB (models)
Total: ~8.5GB
```

## Troubleshooting

### Volume not mounting:
```bash
# Check if volume exists
docker volume ls | grep xtts

# Create manually if needed
docker volume create xtts-models
```

### Model corrupted:
```bash
# Delete and re-download
docker stop xtts
docker rm xtts
docker volume rm xtts-models
./START_XTTS.sh
```

### Out of space:
```bash
# Check Docker disk usage
docker system df

# Clean up unused volumes
docker volume prune

# Or remove specific volume
docker volume rm xtts-models
```

### Check what's in volume:
```bash
# List files in volume
docker run --rm \
  -v xtts-models:/data \
  alpine ls -lah /data

# Check model files
docker run --rm \
  -v xtts-models:/data \
  alpine find /data -name "*.pth" -o -name "*.json"
```

## Benefits

### Without Volumes (Bad):
```
1. Build image (10 min)
2. Start container
3. Download model (5 min)
4. Total: 15 min

Rebuild:
1. Build image (10 min)
2. Start container
3. Download model AGAIN (5 min)
4. Total: 15 min EVERY TIME
```

### With Volumes (Good):
```
First time:
1. Build image (10 min)
2. Start container
3. Download model (5 min)
4. Total: 15 min

Rebuild:
1. Build image (10 min)
2. Start container
3. Load from volume (30 sec)
4. Total: 10.5 min
```

**Saves 5 minutes on every rebuild!** ⚡

## Volume Locations

### macOS (Docker Desktop):
```
~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/
```

### Linux:
```
/var/lib/docker/volumes/
```

### Windows (WSL2):
```
\\wsl$\docker-desktop-data\data\docker\volumes\
```

## Best Practices

1. **Never delete volumes** unless you need to free space
2. **Backup volumes** before major changes
3. **Use separate volumes** for each service (already done!)
4. **Monitor disk usage** with `docker system df`
5. **Clean up unused volumes** periodically with `docker volume prune`

## Summary

✅ **XTTS v2 already uses persistent volume**: `xtts-models`
✅ **YourTTS already uses persistent volume**: `yourtts-models`
✅ **Models persist across rebuilds**: No re-download needed
✅ **Easy to manage**: Simple Docker commands
✅ **Space efficient**: Models stored once, shared across rebuilds

**You're all set!** The volume is already configured in START_XTTS.sh. Models will persist automatically. 🚀
