# Vocal Isolation System

## Overview

The Vocal Isolation System is a critical component of the robust AI video dubbing pipeline. It extracts clean vocal samples from audio that may contain background music, sound effects, and ambient noise. These clean samples (called "Clean Style Prompts") are used for high-quality voice cloning.

## Architecture

### Components

1. **Demucs Service** - Separates vocals from music and effects
2. **Noise Reduction Service** - Removes ambient noise and hiss
3. **Vocal Isolation Service** - Orchestrates the complete pipeline
4. **Quality Validator** - Validates output quality

### Pipeline Flow

```
Original Audio Segment
        ↓
    Extract Segment (FFmpeg)
        ↓
    Separate Vocals (Demucs)
        ↓
    Reduce Noise (noisereduce)
        ↓
    Validate Quality
        ↓
    Clean Style Prompt
```

## Requirements

### System Requirements

- **Demucs Service**: GPU-enabled container (CUDA 12.1+)
- **Noise Reduction Service**: CPU-only container
- **Storage**: Temporary storage for intermediate files
- **FFmpeg**: For audio extraction and manipulation

### Quality Requirements (Requirements 22.1, 22.2)

- **Minimum SNR**: 15 dB
- **Minimum Spectral Purity**: 60%
- **Music Energy Reduction**: 50%+ (when comparing before/after)
- **Minimum Duration**: 1 second per segment

## Usage

### Basic Usage

```typescript
import { VocalIsolationService } from './lib/vocal-isolation';

const service = new VocalIsolationService({
  tempDir: '/tmp/vocal-isolation',
});

// Process a single segment
const cleanPath = await service.processSegment(
  '/path/to/full/audio.wav',
  {
    id: 0,
    startMs: 1000,
    endMs: 4000,
    text: 'Hello world',
    speaker: 'SPEAKER_00',
  },
  '/output/directory'
);

console.log(`Clean vocals saved to: ${cleanPath}`);
```

### Batch Processing

```typescript
// Process multiple segments
const segments = [
  { id: 0, startMs: 0, endMs: 3000, text: 'First segment', speaker: 'SPEAKER_00' },
  { id: 1, startMs: 3000, endMs: 6000, text: 'Second segment', speaker: 'SPEAKER_00' },
];

const results = await service.processSegments(
  '/path/to/full/audio.wav',
  segments,
  '/output/directory'
);

// Results is a Map<segmentId, cleanPath>
for (const [segmentId, cleanPath] of results.entries()) {
  console.log(`Segment ${segmentId}: ${cleanPath}`);
}
```

### Quality Validation

```typescript
import { VocalIsolationQualityValidator } from './lib/vocal-isolation-quality';

const validator = new VocalIsolationQualityValidator();

// Validate a single file
const metrics = await validator.validateQuality(
  '/path/to/clean/vocals.wav',
  '/path/to/original/audio.wav' // Optional, for comparison
);

console.log(`SNR: ${metrics.snr.toFixed(1)} dB`);
console.log(`Spectral Purity: ${(metrics.spectralPurity * 100).toFixed(1)}%`);
console.log(`Suitable: ${metrics.suitable ? 'YES' : 'NO'}`);

if (metrics.warnings.length > 0) {
  console.log('Warnings:');
  metrics.warnings.forEach(w => console.log(`  - ${w}`));
}

// Generate report
const report = validator.generateReport(metrics);
console.log(report);
```

## Worker Integration

### Vocal Isolation Worker

The worker processes jobs from the `vocal-isolation` queue:

```typescript
import { VocalIsolationWorker } from './vocal-isolation-worker';

const worker = new VocalIsolationWorker(redisConnection);

// Worker automatically processes jobs and updates Context Map
```

### Job Data Structure

```typescript
interface VocalIsolationJobData {
  projectId: string;
  audioUrl: string;
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker: string;
  }>;
  outputDir: string;
}
```

## Quality Metrics

### Signal-to-Noise Ratio (SNR)

Measures the ratio of signal power to noise power in dB.

- **Excellent**: > 25 dB
- **Good**: 20-25 dB
- **Acceptable**: 15-20 dB
- **Poor**: < 15 dB

### Spectral Purity

Measures how tonal (vs. noisy) the audio is (0-1 scale).

- **Excellent**: > 0.8
- **Good**: 0.7-0.8
- **Acceptable**: 0.6-0.7
- **Poor**: < 0.6

### Music Energy Reduction

Percentage reduction in music frequency bands after vocal isolation.

- **Excellent**: > 80%
- **Good**: 70-80%
- **Acceptable**: 50-70%
- **Poor**: < 50%

## Configuration

### Environment Variables

```bash
# Demucs service URL
DEMUCS_SERVICE_URL=http://localhost:8010

# Noise reduction service URL
NOISEREDUCE_SERVICE_URL=http://localhost:8011

# Temporary directory for processing
VOCAL_ISOLATION_TEMP_DIR=/tmp/vocal-isolation

# Worker concurrency
VOCAL_ISOLATION_CONCURRENCY=1
```

### Docker Services

#### Demucs Service

```yaml
demucs:
  build: ./packages/workers/docker/demucs
  ports:
    - "8010:8010"
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

#### Noise Reduction Service

```yaml
noisereduce:
  build: ./packages/workers/docker/noisereduce
  ports:
    - "8011:8011"
```

## Testing

### Unit Tests

```bash
npm test -- vocal-isolation.test.ts
```

### Integration Tests

Create test audio files with music:

```bash
# Generate test audio with music and speech
ffmpeg -f lavfi -i "sine=frequency=440:duration=5" \
       -f lavfi -i "sine=frequency=880:duration=5" \
       -filter_complex "[0:a][1:a]amix=inputs=2:duration=first" \
       test_audio_with_music.wav
```

### Quality Validation Tests

```typescript
// Test with music-contaminated sample
const metrics = await validator.validateQuality(
  'test_vocals_with_music.wav',
  'test_original.wav'
);

expect(metrics.musicEnergyReduction).toBeGreaterThan(50);
expect(metrics.suitable).toBe(true);
```

## Troubleshooting

### Low SNR

**Problem**: SNR below 15 dB

**Solutions**:
- Check input audio quality
- Increase noise reduction strength
- Use longer audio segments (more signal)

### Low Spectral Purity

**Problem**: Spectral purity below 60%

**Solutions**:
- Verify Demucs successfully separated vocals
- Check for remaining music artifacts
- Consider using different Demucs model

### Insufficient Music Reduction

**Problem**: Music energy reduction below 50%

**Solutions**:
- Verify Demucs service is running correctly
- Check GPU availability for Demucs
- Try processing with different Demucs parameters

### Service Connection Errors

**Problem**: Cannot connect to Demucs or noise reduction service

**Solutions**:
- Verify services are running: `docker ps`
- Check service health: `curl http://localhost:8010/health`
- Verify network connectivity
- Check firewall rules

## Performance

### Processing Times

- **Segment Extraction**: ~0.1-0.5 seconds
- **Demucs Separation**: ~2-5 seconds per segment (GPU)
- **Noise Reduction**: ~0.5-1 second per segment (CPU)
- **Total**: ~3-7 seconds per segment

### Optimization Tips

1. **Batch Processing**: Process multiple segments in parallel
2. **GPU Utilization**: Ensure Demucs has dedicated GPU
3. **Caching**: Cache intermediate results when possible
4. **Segment Length**: Optimal segment length is 2-5 seconds

## Best Practices

1. **Always validate quality** before using for voice cloning
2. **Monitor metrics** to detect quality degradation
3. **Keep intermediate files** during development for debugging
4. **Use appropriate thresholds** based on your quality requirements
5. **Test with diverse audio** (different music genres, noise types)

## References

- Demucs: https://github.com/facebookresearch/demucs
- noisereduce: https://github.com/timsainb/noisereduce
- Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 22.1, 22.2
