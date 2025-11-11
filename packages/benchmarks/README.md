# Model Quality Benchmarking Suite

This package contains benchmarking tools and datasets for evaluating the quality of AI models used in the video dubbing platform.

## Overview

The benchmarking suite evaluates four key pipeline stages:
- **STT (Speech-to-Text)**: Word Error Rate (WER) and speaker diarization accuracy
- **MT (Machine Translation)**: BLEU scores and glossary term accuracy
- **TTS (Text-to-Speech)**: Mean Opinion Score (MOS) and voice clone similarity
- **Lip-Sync**: Synchronization accuracy and face restoration quality

## Directory Structure

```
benchmarks/
├── datasets/           # Benchmark datasets
│   ├── stt/           # STT test audio and ground truth transcripts
│   ├── mt/            # Parallel corpus for translation evaluation
│   ├── tts/           # Audio samples for TTS quality assessment
│   └── lipsync/       # Video samples for lip-sync evaluation
├── results/           # Benchmark results and reports
├── src/
│   ├── datasets/      # Dataset preparation utilities
│   ├── metrics/       # Metric calculation implementations
│   ├── scripts/       # Benchmark execution scripts
│   └── utils/         # Helper utilities
└── README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Prepare benchmark datasets:
```bash
npm run prepare-datasets
```

This will download and prepare test datasets for all pipeline stages.

## Running Benchmarks

### STT Benchmarks
```bash
npm run benchmark-stt
```

Evaluates:
- Word Error Rate (WER) on test dataset
- Speaker diarization accuracy
- Performance on different audio quality levels

### MT Benchmarks
```bash
npm run benchmark-mt
```

Evaluates:
- BLEU scores for supported language pairs
- Glossary term accuracy
- Context preservation and fluency

### TTS Benchmarks
```bash
npm run benchmark-tts
```

Evaluates:
- Voice clone similarity scores
- Emotional tone preservation
- Comparison with commercial TTS services

### Lip-Sync Benchmarks
```bash
npm run benchmark-lipsync
```

Evaluates:
- Lip-sync accuracy using automated metrics
- Face restoration quality
- Performance on different video qualities

### Generate Report
```bash
npm run generate-report
```

Creates a comprehensive quality report with all benchmark results.

## Dataset Sources

### STT Datasets
- **LibriSpeech test-clean**: Clean speech for baseline WER
- **Common Voice**: Multi-speaker audio for diarization testing
- **Custom noisy samples**: Audio with various noise levels

### MT Datasets
- **WMT test sets**: Standard parallel corpus for BLEU evaluation
- **Custom glossary tests**: Domain-specific terminology accuracy

### TTS Datasets
- **VCTK Corpus**: Multi-speaker audio for voice clone evaluation
- **Emotional Speech Dataset**: Emotional tone preservation testing

### Lip-Sync Datasets
- **LRS2/LRS3**: Lip-reading datasets for sync accuracy
- **Custom video samples**: Various face angles and video qualities

## Metrics

### STT Metrics
- **WER (Word Error Rate)**: Percentage of word errors in transcription
- **DER (Diarization Error Rate)**: Speaker identification accuracy
- **Confidence Score**: Average model confidence

### MT Metrics
- **BLEU Score**: Translation quality metric (0-100)
- **Glossary Accuracy**: Percentage of correct glossary term translations
- **Fluency Score**: Human-rated naturalness (1-5)

### TTS Metrics
- **MOS (Mean Opinion Score)**: Human-rated audio quality (1-5)
- **Similarity Score**: Voice clone similarity to reference (0-1)
- **Emotion Accuracy**: Emotional tone preservation (%)

### Lip-Sync Metrics
- **Sync Confidence**: Automated lip-sync accuracy score (0-1)
- **Face Quality**: PSNR/SSIM for face restoration
- **Processing Time**: Seconds per frame

## Results

Benchmark results are stored in `results/` directory with timestamps:
- `results/stt_benchmark_YYYYMMDD_HHMMSS.json`
- `results/mt_benchmark_YYYYMMDD_HHMMSS.json`
- `results/tts_benchmark_YYYYMMDD_HHMMSS.json`
- `results/lipsync_benchmark_YYYYMMDD_HHMMSS.json`
- `results/comprehensive_report_YYYYMMDD_HHMMSS.md`

## Continuous Benchmarking

Benchmarks should be run:
- Before deploying new model versions
- After significant pipeline changes
- Monthly for quality monitoring
- When comparing with competitor services
