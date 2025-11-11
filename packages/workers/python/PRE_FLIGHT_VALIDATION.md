# Pre-Flight Validation System

The pre-flight validation system ensures all pipeline components work correctly before processing user videos. It validates critical functionality including vocal isolation, noise reduction, few-shot examples, conform operations, and absolute synchronization.

## Overview

The validation system runs automatically on application startup and can also be run manually for testing and debugging. It performs the following tests:

1. **Vocal Isolation Test** - Verifies Demucs can separate vocals from music
2. **Noise Reduction Test** - Verifies noisereduce can clean vocals
3. **Few-Shot Examples Test** - Validates few-shot examples file structure
4. **Conform Operation Test** - Tests FFmpeg atempo produces exact durations
5. **Absolute Synchronization Test** - Verifies overlay places audio at exact positions

## Running Validation

### Automatic (On Startup)

The validation runs automatically when the backend server starts:

```bash
cd packages/backend
npm run dev
```

In production mode, the server will fail to start if validation fails. In development mode, it will log warnings but continue.

### Manual Execution

Run validation manually using the Python script:

```bash
cd packages/workers/python
python3 pre_flight_validator.py
```

Or use the shell script:

```bash
cd packages/workers/python
./run_pre_flight_validation.sh
```

### From TypeScript

```typescript
import { preFlightValidator } from './lib/pre-flight-validator';

// Run all validations
const results = await preFlightValidator.runAllValidations();

// Run with timeout
const results = await preFlightValidator.runWithTimeout(60000);
```

## Test Details

### 1. Vocal Isolation Test

**Purpose**: Verify Demucs can separate vocals from background music and effects.

**Process**:
- Creates test audio with speech and music tones
- Runs Demucs vocal separation
- Measures music energy in isolated vocals
- Passes if music energy < 15%

**Requirements**: Demucs service must be available

### 2. Noise Reduction Test

**Purpose**: Verify noisereduce can remove ambient noise and hiss.

**Process**:
- Creates test audio with speech and white noise
- Applies noise reduction
- Measures SNR (Signal-to-Noise Ratio) improvement
- Passes if SNR improves by at least 3dB

**Requirements**: noisereduce service must be available

### 3. Few-Shot Examples Test

**Purpose**: Validate few-shot examples file exists and has correct structure.

**Process**:
- Loads `few_shot_examples.json`
- Verifies all language pairs have required fields
- Checks minimum 3 examples per language pair
- Validates field types and values

**Requirements**: `packages/backend/src/lib/few_shot_examples.json` must exist

### 4. Conform Operation Test

**Purpose**: Test FFmpeg atempo filter produces exact target durations.

**Process**:
- Creates 1-second test audio
- Conforms to various target durations (0.5s, 0.75s, 1.5s, 2.0s)
- Verifies conformed audio has exact target duration (±10ms tolerance)
- Tests multiple tempo factors

**Requirements**: FFmpeg must be installed, absolute_sync_assembler must be available

### 5. Absolute Synchronization Test

**Purpose**: Verify Pydub overlay places audio at exact millisecond positions.

**Process**:
- Creates 10-second silent base track
- Creates 1-second test tone
- Overlays tone at multiple positions (2s, 5s, 8s)
- Verifies tone is at correct position with silence before/after
- Checks total duration remains unchanged

**Requirements**: Pydub must be installed

## Configuration

### Environment Variables

- `NODE_ENV` - Set to `production` to fail startup on validation errors
- `PRE_FLIGHT_VALIDATION_TIMEOUT` - Timeout in milliseconds (default: 60000)

### Disabling Validation

To disable validation in development:

```typescript
// In packages/backend/src/index.ts
const failOnError = false; // Always continue even if validation fails
await runStartupValidation(failOnError);
```

## Test Assets

Test assets are created dynamically in the `test_assets/` directory:

- `music_and_speech.wav` - Test audio for vocal isolation
- `noisy_vocals.wav` - Test audio for noise reduction
- `test_1s.wav` - Test audio for conform operations

These files are temporary and cleaned up after each test.

## Troubleshooting

### Validation Fails on Startup

If validation fails on startup:

1. Check that all required services are running (Demucs, noisereduce)
2. Verify FFmpeg is installed: `ffmpeg -version`
3. Check Python packages are installed: `pip list | grep -E "numpy|librosa|soundfile|pydub"`
4. Run validation manually to see detailed error messages
5. Check logs for specific test failures

### Service Not Available Warnings

If a service (Demucs, noisereduce) is not available, the test will be skipped with a warning. This is normal in development environments where not all services may be running.

### Timeout Errors

If validation times out:

1. Increase timeout: `await preFlightValidator.runWithTimeout(120000)`
2. Check system resources (CPU, memory)
3. Verify services are responding

## Integration with CI/CD

Add validation to your CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
- name: Run Pre-Flight Validation
  run: |
    cd packages/workers/python
    python3 pre_flight_validator.py
```

## Monitoring

Validation results are logged using the application logger:

```typescript
logger.info('✓ All pre-flight validation tests passed');
logger.error('✗ Pre-flight validation failed. Failed tests: ...');
```

Monitor these logs in production to detect issues early.

## Best Practices

1. **Always run validation before deploying** - Catch issues before they affect users
2. **Monitor validation in production** - Set up alerts for validation failures
3. **Keep test assets minimal** - Tests should complete in < 60 seconds
4. **Update tests when adding features** - Add new validation tests for new pipeline components
5. **Document test requirements** - Clearly specify what each test validates

## Related Documentation

- [Absolute Synchronization](./ABSOLUTE_SYNC_IMPLEMENTATION.md)
- [Vocal Isolation](../../backend/VOCAL_ISOLATION.md)
- [Adaptation Engine](../../backend/ADAPTATION_ENGINE.md)
- [Context Map](../../backend/CONTEXT_MAP.md)
