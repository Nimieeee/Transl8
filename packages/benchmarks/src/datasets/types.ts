/**
 * Common types for benchmark datasets
 */

export interface STTTestCase {
  id: string;
  audioPath: string;
  groundTruthTranscript: string;
  language: string;
  duration: number;
  speakerCount: number;
  audioQuality: 'clean' | 'noisy' | 'very_noisy';
  speakers?: Array<{
    id: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
}

export interface MTTestCase {
  id: string;
  sourceText: string;
  referenceTranslation: string;
  sourceLang: string;
  targetLang: string;
  domain: string;
  glossaryTerms?: Record<string, string>;
}

export interface TTSTestCase {
  id: string;
  text: string;
  language: string;
  referenceAudioPath?: string;
  voiceCloneSamplePath?: string;
  emotionalTone: string;
  expectedDuration: number;
}

export interface LipSyncTestCase {
  id: string;
  videoPath: string;
  audioPath: string;
  videoQuality: '480p' | '720p' | '1080p';
  faceAngle: 'frontal' | 'profile' | 'three_quarter';
  duration: number;
}

export interface BenchmarkDataset<T> {
  name: string;
  version: string;
  description: string;
  testCases: T[];
  metadata: {
    createdAt: string;
    source: string;
    totalCases: number;
  };
}

export interface BenchmarkResult {
  testCaseId: string;
  success: boolean;
  metrics: Record<string, number>;
  processingTime: number;
  error?: string;
}

export interface BenchmarkReport {
  stage: 'stt' | 'mt' | 'tts' | 'lipsync';
  timestamp: string;
  modelVersion: string;
  results: BenchmarkResult[];
  aggregateMetrics: Record<string, number>;
  summary: string;
}
