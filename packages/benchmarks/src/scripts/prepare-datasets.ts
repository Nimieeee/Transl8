#!/usr/bin/env ts-node

/**
 * Dataset Preparation Script
 * Prepares all benchmark datasets for model evaluation
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createSampleSTTDataset,
  STTDatasetBuilder,
} from '../datasets/stt-dataset';
import {
  createSampleMTDataset,
  MTDatasetBuilder,
} from '../datasets/mt-dataset';
import {
  createSampleTTSDataset,
  TTSDatasetBuilder,
} from '../datasets/tts-dataset';
import {
  createSampleLipSyncDataset,
  LipSyncDatasetBuilder,
} from '../datasets/lipsync-dataset';

const DATASETS_DIR = path.join(__dirname, '../../datasets');
const RESULTS_DIR = path.join(__dirname, '../../results');

function ensureDirectories(): void {
  const dirs = [
    DATASETS_DIR,
    path.join(DATASETS_DIR, 'stt'),
    path.join(DATASETS_DIR, 'stt/samples'),
    path.join(DATASETS_DIR, 'mt'),
    path.join(DATASETS_DIR, 'tts'),
    path.join(DATASETS_DIR, 'tts/samples'),
    path.join(DATASETS_DIR, 'lipsync'),
    path.join(DATASETS_DIR, 'lipsync/samples'),
    RESULTS_DIR,
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

function createDatasetReadme(datasetType: string, description: string): void {
  const readmePath = path.join(DATASETS_DIR, datasetType, 'README.md');
  const content = `# ${datasetType.toUpperCase()} Benchmark Dataset

${description}

## Structure

- \`dataset.json\`: Test cases with metadata
- \`samples/\`: Audio/video sample files

## Usage

This dataset is used by the \`benchmark-${datasetType}\` script to evaluate model quality.

## Adding Custom Test Cases

You can add custom test cases by:
1. Adding sample files to the \`samples/\` directory
2. Updating \`dataset.json\` with the new test case metadata
3. Running the benchmark script

## Dataset Sources

See the main benchmarks README for information about dataset sources and licensing.
`;

  fs.writeFileSync(readmePath, content);
  console.log(`Created README for ${datasetType} dataset`);
}

async function main(): Promise<void> {
  console.log('=== Benchmark Dataset Preparation ===\n');

  // Ensure directory structure exists
  console.log('Creating directory structure...');
  ensureDirectories();
  console.log('✓ Directories created\n');

  // Create STT dataset
  console.log('Preparing STT dataset...');
  const sttDataset = createSampleSTTDataset();
  createDatasetReadme(
    'stt',
    'Test dataset for evaluating speech-to-text transcription and speaker diarization accuracy.'
  );
  console.log(`✓ STT dataset created with ${sttDataset.testCases.length} test cases\n`);

  // Create MT dataset
  console.log('Preparing MT dataset...');
  const mtDataset = createSampleMTDataset();
  createDatasetReadme(
    'mt',
    'Parallel corpus for evaluating machine translation quality and glossary term accuracy.'
  );
  console.log(`✓ MT dataset created with ${mtDataset.testCases.length} test cases\n`);

  // Create TTS dataset
  console.log('Preparing TTS dataset...');
  const ttsDataset = createSampleTTSDataset();
  createDatasetReadme(
    'tts',
    'Audio samples for evaluating text-to-speech quality, voice cloning, and emotional tone preservation.'
  );
  console.log(`✓ TTS dataset created with ${ttsDataset.testCases.length} test cases\n`);

  // Create Lip-Sync dataset
  console.log('Preparing Lip-Sync dataset...');
  const lipsyncDataset = createSampleLipSyncDataset();
  createDatasetReadme(
    'lipsync',
    'Video samples for evaluating lip synchronization accuracy and face restoration quality.'
  );
  console.log(
    `✓ Lip-Sync dataset created with ${lipsyncDataset.testCases.length} test cases\n`
  );

  // Create summary
  const summary = {
    preparedAt: new Date().toISOString(),
    datasets: {
      stt: {
        totalCases: sttDataset.testCases.length,
        path: './datasets/stt/dataset.json',
      },
      mt: {
        totalCases: mtDataset.testCases.length,
        path: './datasets/mt/dataset.json',
      },
      tts: {
        totalCases: ttsDataset.testCases.length,
        path: './datasets/tts/dataset.json',
      },
      lipsync: {
        totalCases: lipsyncDataset.testCases.length,
        path: './datasets/lipsync/dataset.json',
      },
    },
  };

  const summaryPath = path.join(DATASETS_DIR, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('=== Dataset Preparation Complete ===');
  console.log(`\nTotal test cases prepared: ${
    sttDataset.testCases.length +
    mtDataset.testCases.length +
    ttsDataset.testCases.length +
    lipsyncDataset.testCases.length
  }`);
  console.log(`\nDatasets location: ${DATASETS_DIR}`);
  console.log(`Summary saved to: ${summaryPath}`);
  console.log('\nNext steps:');
  console.log('1. Add actual audio/video sample files to the samples/ directories');
  console.log('2. Run individual benchmark scripts: npm run benchmark-stt, etc.');
  console.log('3. Generate comprehensive report: npm run generate-report');
}

main().catch((error) => {
  console.error('Error preparing datasets:', error);
  process.exit(1);
});
