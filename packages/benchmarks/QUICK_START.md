# Benchmarking Quick Start Guide

This guide will help you get started with running model quality benchmarks for the AI video dubbing platform.

## Prerequisites

- Node.js 18+ and npm
- Access to the platform API (running locally or deployed)
- Sample audio/video files for testing (optional, mock data will be used if not available)

## Installation

1. Navigate to the benchmarks package:
```bash
cd packages/benchmarks
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Step 1: Prepare Datasets

First, prepare the benchmark datasets:

```bash
npm run prepare-datasets
```

This will:
- Create the directory structure for datasets
- Generate sample test cases for all pipeline stages
- Create dataset metadata files

**Optional:** Add your own test samples to the `datasets/*/samples/` directories for more comprehensive testing.

## Step 2: Run Individual Benchmarks

### STT Benchmark

Evaluate speech-to-text transcription and speaker diarization:

```bash
npm run benchmark-stt
```

Metrics evaluated:
- Word Error Rate (WER)
- Diarization Error Rate (DER)
- Transcription confidence
- Performance on different audio qualities

### MT Benchmark

Evaluate machine translation quality:

```bash
npm run benchmark-mt
```

Metrics evaluated:
- BLEU scores
- Glossary term accuracy
- Fluency scores
- Performance by language pair

### TTS Benchmark

Evaluate text-to-speech quality:

```bash
npm run benchmark-tts
```

Metrics evaluated:
- Mean Opinion Score (MOS)
- Voice clone similarity
- Emotional tone preservation
- Pronunciation accuracy

### Lip-Sync Benchmark

Evaluate lip synchronization quality:

```bash
npm run benchmark-lipsync
```

Metrics evaluated:
- Sync confidence
- Face restoration quality (PSNR, SSIM)
- Processing speed (FPS)
- Performance by video quality and face angle

## Step 3: Generate Comprehensive Report

After running all benchmarks, generate a comprehensive report:

```bash
npm run generate-report
```

This will:
- Combine all benchmark results
- Generate comparison with commercial services
- Provide recommendations for improvement
- Create both JSON and Markdown reports

## Results

All benchmark results are saved in the `results/` directory:

- `stt_benchmark_TIMESTAMP.json` - STT benchmark results
- `mt_benchmark_TIMESTAMP.json` - MT benchmark results
- `tts_benchmark_TIMESTAMP.json` - TTS benchmark results
- `lipsync_benchmark_TIMESTAMP.json` - Lip-sync benchmark results
- `comprehensive_report_TIMESTAMP.json` - Combined JSON report
- `comprehensive_report_TIMESTAMP.md` - Human-readable report

## Configuration

### API Endpoint

By default, benchmarks connect to `http://localhost:3001`. To use a different endpoint:

```bash
export API_BASE_URL=https://your-api-endpoint.com
npm run benchmark-stt
```

### Custom Datasets

To use custom test cases:

1. Add your audio/video files to the appropriate `datasets/*/samples/` directory
2. Edit the `datasets/*/dataset.json` file to add test case metadata
3. Run the benchmark

Example for adding a custom STT test case:

```json
{
  "id": "custom_001",
  "audioPath": "./datasets/stt/samples/my_audio.wav",
  "groundTruthTranscript": "This is my custom test transcript.",
  "language": "en",
  "duration": 5.0,
  "speakerCount": 1,
  "audioQuality": "clean"
}
```

## Continuous Benchmarking

For continuous quality monitoring, consider:

1. **Pre-deployment**: Run benchmarks before deploying new model versions
2. **Scheduled**: Run monthly benchmarks to track quality over time
3. **A/B Testing**: Compare different model configurations
4. **Regression Testing**: Ensure changes don't degrade quality

## Troubleshooting

### "No benchmark reports found"

Make sure you've run at least one individual benchmark before generating the comprehensive report.

### "API connection failed"

- Verify the API is running at the configured endpoint
- Check that model services are deployed and accessible
- Benchmarks will use mock data if the API is unavailable (for testing purposes)

### "Audio/video files not found"

- The benchmarks will use mock data if sample files are missing
- Add actual sample files to `datasets/*/samples/` for real testing

## Best Practices

1. **Baseline First**: Run benchmarks on your initial model versions to establish a baseline
2. **Version Control**: Keep benchmark results in version control to track improvements
3. **Document Changes**: Note any model or configuration changes when running benchmarks
4. **Regular Cadence**: Run benchmarks on a regular schedule (e.g., monthly)
5. **Share Results**: Share benchmark reports with the team for transparency

## Example Workflow

```bash
# 1. Prepare datasets (one time)
npm run prepare-datasets

# 2. Run all benchmarks
npm run benchmark-stt
npm run benchmark-mt
npm run benchmark-tts
npm run benchmark-lipsync

# 3. Generate comprehensive report
npm run generate-report

# 4. Review the report
cat results/comprehensive_report_*.md
```

## Next Steps

- Review the comprehensive report for recommendations
- Address any identified quality issues
- Compare results with competitor services
- Schedule next benchmark run
- Consider publishing results for transparency
