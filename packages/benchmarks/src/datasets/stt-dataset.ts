import * as fs from 'fs';
import * as path from 'path';
import { STTTestCase, BenchmarkDataset } from './types';

/**
 * STT Dataset Preparation
 * Curates test datasets for speech-to-text evaluation
 */

export class STTDatasetBuilder {
  private testCases: STTTestCase[] = [];
  private datasetDir: string;

  constructor(datasetDir: string = './datasets/stt') {
    this.datasetDir = datasetDir;
    this.ensureDirectoryExists(datasetDir);
  }

  /**
   * Add a test case from LibriSpeech format
   */
  addLibriSpeechCase(audioPath: string, transcriptPath: string, caseId: string): void {
    const transcript = fs.readFileSync(transcriptPath, 'utf-8').trim();
    const duration = this.estimateAudioDuration(audioPath);

    this.testCases.push({
      id: caseId,
      audioPath,
      groundTruthTranscript: transcript,
      language: 'en',
      duration,
      speakerCount: 1,
      audioQuality: 'clean',
    });
  }

  /**
   * Add a multi-speaker test case with diarization ground truth
   */
  addMultiSpeakerCase(
    audioPath: string,
    speakers: Array<{
      id: string;
      segments: Array<{ start: number; end: number; text: string }>;
    }>,
    caseId: string,
    audioQuality: 'clean' | 'noisy' | 'very_noisy' = 'clean'
  ): void {
    const fullTranscript = speakers.flatMap((s) => s.segments.map((seg) => seg.text)).join(' ');
    const duration = Math.max(...speakers.flatMap((s) => s.segments.map((seg) => seg.end)));

    this.testCases.push({
      id: caseId,
      audioPath,
      groundTruthTranscript: fullTranscript,
      language: 'en',
      duration,
      speakerCount: speakers.length,
      audioQuality,
      speakers,
    });
  }

  /**
   * Add synthetic noisy audio test case
   */
  addNoisyCase(
    cleanAudioPath: string,
    transcript: string,
    noiseLevel: 'noisy' | 'very_noisy',
    caseId: string
  ): void {
    const noisyAudioPath = this.generateNoisyAudio(cleanAudioPath, noiseLevel, caseId);
    const duration = this.estimateAudioDuration(noisyAudioPath);

    this.testCases.push({
      id: caseId,
      audioPath: noisyAudioPath,
      groundTruthTranscript: transcript,
      language: 'en',
      duration,
      speakerCount: 1,
      audioQuality: noiseLevel,
    });
  }

  /**
   * Build and save the dataset
   */
  build(): BenchmarkDataset<STTTestCase> {
    const dataset: BenchmarkDataset<STTTestCase> = {
      name: 'STT Benchmark Dataset',
      version: '1.0.0',
      description:
        'Test dataset for evaluating speech-to-text transcription and speaker diarization',
      testCases: this.testCases,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'LibriSpeech, Common Voice, Custom',
        totalCases: this.testCases.length,
      },
    };

    const outputPath = path.join(this.datasetDir, 'dataset.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
    console.log(`STT dataset saved to ${outputPath}`);
    console.log(`Total test cases: ${this.testCases.length}`);

    return dataset;
  }

  /**
   * Load existing dataset
   */
  static load(datasetDir: string = './datasets/stt'): BenchmarkDataset<STTTestCase> {
    const datasetPath = path.join(datasetDir, 'dataset.json');
    const data = fs.readFileSync(datasetPath, 'utf-8');
    return JSON.parse(data);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private estimateAudioDuration(audioPath: string): number {
    // Placeholder: In real implementation, use ffprobe or audio library
    // For now, return a default value
    return 10.0;
  }

  private generateNoisyAudio(cleanPath: string, noiseLevel: string, caseId: string): string {
    // Placeholder: In real implementation, add noise using ffmpeg or audio library
    // For now, return the clean path with a marker
    const noisyPath = path.join(this.datasetDir, `${caseId}_${noiseLevel}.wav`);
    // In production: ffmpeg -i clean.wav -i noise.wav -filter_complex amix noisy.wav
    return noisyPath;
  }
}

/**
 * Create sample STT dataset
 */
export function createSampleSTTDataset(): BenchmarkDataset<STTTestCase> {
  const builder = new STTDatasetBuilder();

  // Sample clean speech cases
  builder.testCases.push({
    id: 'clean_001',
    audioPath: './datasets/stt/samples/clean_001.wav',
    groundTruthTranscript: 'The quick brown fox jumps over the lazy dog.',
    language: 'en',
    duration: 3.5,
    speakerCount: 1,
    audioQuality: 'clean',
  });

  builder.testCases.push({
    id: 'clean_002',
    audioPath: './datasets/stt/samples/clean_002.wav',
    groundTruthTranscript: 'Artificial intelligence is transforming the way we create content.',
    language: 'en',
    duration: 4.2,
    speakerCount: 1,
    audioQuality: 'clean',
  });

  // Sample multi-speaker case
  builder.testCases.push({
    id: 'multi_001',
    audioPath: './datasets/stt/samples/multi_001.wav',
    groundTruthTranscript: 'Hello everyone. Welcome to the show. Thanks for having me.',
    language: 'en',
    duration: 6.0,
    speakerCount: 2,
    audioQuality: 'clean',
    speakers: [
      {
        id: 'SPEAKER_00',
        segments: [
          { start: 0.0, end: 2.5, text: 'Hello everyone.' },
          { start: 2.5, end: 4.0, text: 'Welcome to the show.' },
        ],
      },
      {
        id: 'SPEAKER_01',
        segments: [{ start: 4.0, end: 6.0, text: 'Thanks for having me.' }],
      },
    ],
  });

  // Sample noisy case
  builder.testCases.push({
    id: 'noisy_001',
    audioPath: './datasets/stt/samples/noisy_001.wav',
    groundTruthTranscript: 'This audio has background noise.',
    language: 'en',
    duration: 3.0,
    speakerCount: 1,
    audioQuality: 'noisy',
  });

  return builder.build();
}
