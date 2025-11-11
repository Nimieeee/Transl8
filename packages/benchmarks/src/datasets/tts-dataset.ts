import * as fs from 'fs';
import * as path from 'path';
import { TTSTestCase, BenchmarkDataset } from './types';

/**
 * TTS Dataset Preparation
 * Collects audio samples for text-to-speech quality assessment
 */

export class TTSDatasetBuilder {
  private testCases: TTSTestCase[] = [];
  private datasetDir: string;

  constructor(datasetDir: string = './datasets/tts') {
    this.datasetDir = datasetDir;
    this.ensureDirectoryExists(datasetDir);
  }

  /**
   * Add a TTS test case
   */
  addTestCase(
    text: string,
    language: string,
    emotionalTone: string = 'neutral',
    referenceAudioPath?: string,
    voiceCloneSamplePath?: string
  ): void {
    const caseId = `tts_${language}_${this.testCases.length + 1}`;
    const expectedDuration = this.estimateDuration(text);

    this.testCases.push({
      id: caseId,
      text,
      language,
      referenceAudioPath,
      voiceCloneSamplePath,
      emotionalTone,
      expectedDuration,
    });
  }

  /**
   * Add voice cloning test cases
   */
  addVoiceCloningCases(
    cases: Array<{
      text: string;
      language: string;
      samplePath: string;
      referencePath?: string;
    }>
  ): void {
    cases.forEach((tc) => {
      this.addTestCase(tc.text, tc.language, 'neutral', tc.referencePath, tc.samplePath);
    });
  }

  /**
   * Add emotional tone test cases
   */
  addEmotionalCases(
    cases: Array<{
      text: string;
      language: string;
      emotion: string;
      referencePath: string;
    }>
  ): void {
    cases.forEach((tc) => {
      this.addTestCase(tc.text, tc.language, tc.emotion, tc.referencePath);
    });
  }

  /**
   * Build and save the dataset
   */
  build(): BenchmarkDataset<TTSTestCase> {
    const dataset: BenchmarkDataset<TTSTestCase> = {
      name: 'TTS Benchmark Dataset',
      version: '1.0.0',
      description:
        'Audio samples for evaluating text-to-speech quality, voice cloning, and emotional tone',
      testCases: this.testCases,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'VCTK Corpus, Emotional Speech Dataset, Custom',
        totalCases: this.testCases.length,
      },
    };

    const outputPath = path.join(this.datasetDir, 'dataset.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
    console.log(`TTS dataset saved to ${outputPath}`);
    console.log(`Total test cases: ${this.testCases.length}`);

    return dataset;
  }

  /**
   * Load existing dataset
   */
  static load(datasetDir: string = './datasets/tts'): BenchmarkDataset<TTSTestCase> {
    const datasetPath = path.join(datasetDir, 'dataset.json');
    const data = fs.readFileSync(datasetPath, 'utf-8');
    return JSON.parse(data);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private estimateDuration(text: string): number {
    // Rough estimate: ~150 words per minute = 2.5 words per second
    const wordCount = text.split(/\s+/).length;
    return wordCount / 2.5;
  }
}

/**
 * Create sample TTS dataset
 */
export function createSampleTTSDataset(): BenchmarkDataset<TTSTestCase> {
  const builder = new TTSDatasetBuilder();

  // Neutral tone cases
  builder.addTestCase(
    'Welcome to our video dubbing platform. We provide high-quality AI-powered translation.',
    'en',
    'neutral'
  );

  builder.addTestCase('The quick brown fox jumps over the lazy dog.', 'en', 'neutral');

  builder.addTestCase(
    'Artificial intelligence is revolutionizing content creation.',
    'en',
    'neutral'
  );

  // Emotional tone cases
  builder.addTestCase(
    'I am so excited to share this amazing news with you!',
    'en',
    'excited',
    './datasets/tts/samples/excited_reference.wav'
  );

  builder.addTestCase(
    'This is a serious matter that requires our immediate attention.',
    'en',
    'serious',
    './datasets/tts/samples/serious_reference.wav'
  );

  builder.addTestCase(
    'I am deeply sorry for the inconvenience this has caused.',
    'en',
    'apologetic',
    './datasets/tts/samples/apologetic_reference.wav'
  );

  // Voice cloning cases
  builder.addTestCase(
    'This is a test of voice cloning technology.',
    'en',
    'neutral',
    './datasets/tts/samples/clone_reference.wav',
    './datasets/tts/samples/clone_sample.wav'
  );

  builder.addTestCase(
    'The cloned voice should sound natural and authentic.',
    'en',
    'neutral',
    './datasets/tts/samples/clone_reference_2.wav',
    './datasets/tts/samples/clone_sample_2.wav'
  );

  // Multi-language cases
  builder.addTestCase('Bienvenido a nuestra plataforma de doblaje de video.', 'es', 'neutral');

  builder.addTestCase('Bienvenue sur notre plateforme de doublage vidéo.', 'fr', 'neutral');

  return builder.build();
}
