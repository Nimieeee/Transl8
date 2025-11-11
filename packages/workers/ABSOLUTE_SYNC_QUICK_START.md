# Absolute Synchronization Assembly - Quick Start

## Overview

The Absolute Synchronization Assembly system ensures perfect audio-video synchronization by preventing cumulative drift. This guide will help you get started quickly.

## Prerequisites

- Docker and Docker Compose
- FFmpeg installed in the system
- Python 3.10+ (for local development)
- Node.js 18+ (for workers)

## Quick Setup

### 1. Start the Absolute Sync Service

Using Docker Compose (recommended):

```bash
# Add to docker-compose.yml
docker-compose up absolute-sync
```

Or manually:

```bash
cd packages/workers/docker/absolute-sync
docker build -t absolute-sync-service .
docker run -p 8012:8012 -v $(pwd)/../../temp:/app/temp absolute-sync-service
```

### 2. Configure Environment Variables

Add to `packages/workers/.env`:

```bash
ABSOLUTE_SYNC_SERVICE_URL=http://localhost:8012
```

### 3. Test the Service

```bash
# Health check
curl http://localhost:8012/health

# Expected response:
# {"status": "healthy", "service": "absolute-sync-assembler"}
```

## Usage Example

### From TypeScript Worker

```typescript
import { finalAssemblyWorker } from './final-assembly-worker';
import { Job } from 'bullmq';

// Create job data
const jobData = {
  projectId: 'project-uuid',
  userId: 'user-uuid',
};

// Process assembly
await finalAssemblyWorker.process(job);
```

### From Python Service

```python
import requests

# Prepare Context Map
context_map = {
    "project_id": "project-uuid",
    "original_duration_ms": 125500,
    "segments": [
        {
            "id": 0,
            "start_ms": 0,
            "end_ms": 3500,
            "generated_audio_path": "/path/to/segment_0.wav",
            "status": "success"
        }
    ]
}

# Call assembly service
response = requests.post(
    'http://localhost:8012/assemble',
    json={
        'project_id': 'project-uuid',
        'context_map': context_map,
        'output_path': '/path/to/output.wav'
    }
)

result = response.json()
print(f"Success: {result['success']}")
print(f"Duration difference: {result['duration_difference_ms']}ms")
```

## Pipeline Integration

### Complete Dubbing Pipeline

```
1. STT Worker
   ↓ (creates Context Map)
   
2. Vocal Isolation Worker
   ↓ (adds clean_prompt_path)
   
3. Emotion Analysis Worker
   ↓ (adds emotion tags)
   
4. Adaptation Worker
   ↓ (adds adapted_text)
   
5. TTS Worker
   ↓ (adds generated_audio_path)
   
6. Final Assembly Worker ← YOU ARE HERE
   ↓ (creates synchronized audio)
   
7. Muxing Worker
   ↓ (combines audio + video)
   
8. Final Output
```

### Queue Configuration

Add to your queue setup:

```typescript
import { Queue } from 'bullmq';

const finalAssemblyQueue = new Queue('final-assembly', {
  connection: redis,
});

const muxingQueue = new Queue('muxing', {
  connection: redis,
});

// After TTS completes, enqueue final assembly
await finalAssemblyQueue.add('assemble', {
  projectId: 'project-uuid',
  userId: 'user-uuid',
});

// After final assembly completes, enqueue muxing
await muxingQueue.add('mux', {
  projectId: 'project-uuid',
  userId: 'user-uuid',
  videoPath: '/path/to/video.mp4',
  finalAudioPath: '/path/to/final_audio.wav',
  applyWatermark: true,
});
```

## Testing

### Test Silent Base Track

```python
from absolute_sync_assembler import absolute_sync_assembler

# Create 10-second silent track
base_track = absolute_sync_assembler.create_silent_base_track(10000)
print(f"Duration: {len(base_track)}ms")  # Should be 10000
```

### Test Conform Operation

```python
# Conform 1-second audio to 1.5 seconds
conformed_path = absolute_sync_assembler.conform_audio(
    audio_path='test_1s.wav',
    actual_duration_ms=1000,
    target_duration_ms=1500
)

# Verify duration
from pydub import AudioSegment
audio = AudioSegment.from_file(conformed_path)
print(f"Conformed duration: {len(audio)}ms")  # Should be ~1500
```

### Test Complete Assembly

```python
# Load test Context Map
import json
with open('test_context_map.json') as f:
    context_map = json.load(f)

# Assemble
result = absolute_sync_assembler.assemble_final_audio(
    project_id='test',
    context_map=context_map,
    output_path='test_output.wav'
)

print(f"Success: {result['success']}")
print(f"Successful segments: {result['successful_segments']}")
print(f"Duration difference: {result['duration_difference_ms']}ms")
```

## Monitoring

### Check Service Logs

```bash
# Docker logs
docker logs absolute-sync-service

# Look for:
# - "Creating silent base track of Xms"
# - "Conforming audio: Xms -> Yms"
# - "Overlaying at position Xms"
# - "No cumulative drift detected"
```

### Validate Output

```python
# Check final audio duration
from pydub import AudioSegment

final_audio = AudioSegment.from_file('final_dubbed_audio.wav')
print(f"Final duration: {len(final_audio)}ms")

# Compare with original
original_audio = AudioSegment.from_file('original_audio.wav')
print(f"Original duration: {len(original_audio)}ms")
print(f"Difference: {abs(len(final_audio) - len(original_audio))}ms")
```

## Common Issues

### Issue: Service not responding

**Check**:
```bash
curl http://localhost:8012/health
```

**Solution**: Restart the service
```bash
docker-compose restart absolute-sync
```

### Issue: FFmpeg not found

**Error**: `subprocess.CalledProcessError: ffmpeg: command not found`

**Solution**: Ensure FFmpeg is installed in the Docker container
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

### Issue: Audio files not found

**Error**: `Audio file not found: /path/to/segment_X.wav`

**Solution**: Ensure volume mounts are correct
```yaml
volumes:
  - ./packages/workers/temp:/app/temp
```

### Issue: Duration mismatch

**Error**: `Conformed audio duration mismatch`

**Solution**: Check tempo factor calculation and FFmpeg atempo implementation

## Performance Tips

1. **Use SSD storage**: Faster I/O for audio file operations
2. **Increase worker concurrency**: Process multiple projects in parallel
3. **Cache conformed audio**: Reuse conformed segments when possible
4. **Monitor memory usage**: Large audio files can consume significant memory

## Next Steps

1. **Integrate with your pipeline**: Add final assembly and muxing workers to your job queue
2. **Monitor performance**: Track assembly time and drift metrics
3. **Optimize**: Profile and optimize bottlenecks
4. **Scale**: Add more worker instances for higher throughput

## Resources

- [Full Implementation Guide](./ABSOLUTE_SYNC_IMPLEMENTATION.md)
- [Context Map Documentation](../../backend/CONTEXT_MAP.md)
- [FFmpeg atempo filter documentation](https://ffmpeg.org/ffmpeg-filters.html#atempo)
- [Pydub documentation](https://github.com/jiaaro/pydub)

