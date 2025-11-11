/**
 * Mock Adapter Implementation Example
 *
 * This file demonstrates how to implement model adapters
 * for testing and development purposes.
 */

import {
  STTAdapter,
  MTAdapter,
  TTSAdapter,
  LipSyncAdapter,
  STTResult,
  MTResult,
  TTSResult,
  LipSyncResult,
  HealthCheckResult,
  TranscriptSegment,
  TranslationSegment,
  VoiceConfig,
  SpeakerVoiceMapping,
} from '../types';

/**
 * Mock STT Adapter for testing
 */
export class MockSTTAdapter extends STTAdapter {
  name = 'mock-stt';
  version = '1.0.0';

  async transcribe(_audioPath: string, language: string): Promise<STTResult> {
    // Simulate processing delay
    await this.delay(1000);

    // Return mock transcript
    const segments: TranscriptSegment[] = [
      {
        id: 0,
        start: 0.0,
        end: 3.5,
        text: 'Hello everyone, welcome to my channel.',
        speaker: 'SPEAKER_00',
        confidence: 0.95,
        words: [
          { word: 'Hello', start: 0.0, end: 0.5, confidence: 0.98 },
          { word: 'everyone', start: 0.5, end: 1.0, confidence: 0.96 },
          { word: 'welcome', start: 1.0, end: 1.5, confidence: 0.97 },
          { word: 'to', start: 1.5, end: 1.7, confidence: 0.99 },
          { word: 'my', start: 1.7, end: 2.0, confidence: 0.98 },
          { word: 'channel', start: 2.0, end: 3.5, confidence: 0.95 },
        ],
      },
      {
        id: 1,
        start: 4.0,
        end: 7.0,
        text: 'Today we are going to talk about AI.',
        speaker: 'SPEAKER_00',
        confidence: 0.93,
      },
    ];

    return {
      transcript: {
        text: segments.map((s) => s.text).join(' '),
        duration: 7.0,
        language,
        segments,
        speakerCount: 1,
      },
      metadata: {
        processingTime: 1000,
        modelName: this.name,
        modelVersion: this.version,
        confidence: 0.94,
      },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      latency: 50,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock MT Adapter for testing
 */
export class MockMTAdapter extends MTAdapter {
  name = 'mock-mt';
  version = '1.0.0';

  async translate(
    text: string,
    _sourceLanguage: string,
    targetLanguage: string,
    _glossary?: Record<string, string>
  ): Promise<string> {
    // Simulate processing delay
    await this.delay(500);

    // Simple mock translation (just add prefix)
    return `[${targetLanguage}] ${text}`;
  }

  async translateSegments(
    segments: TranscriptSegment[],
    sourceLanguage: string,
    targetLanguage: string,
    _glossary?: Record<string, string>
  ): Promise<MTResult> {
    // Simulate processing delay
    await this.delay(1000);

    const translatedSegments: TranslationSegment[] = segments.map((segment) => ({
      id: segment.id,
      sourceText: segment.text,
      translatedText: `[${targetLanguage}] ${segment.text}`,
      start: segment.start,
      end: segment.end,
      speaker: segment.speaker,
      confidence: 0.9,
    }));

    return {
      translation: {
        sourceLanguage,
        targetLanguage,
        segments: translatedSegments,
        fullText: translatedSegments.map((s) => s.translatedText).join(' '),
      },
      metadata: {
        processingTime: 1000,
        modelName: this.name,
        modelVersion: this.version,
        confidence: 0.9,
      },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      latency: 30,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock TTS Adapter for testing
 */
export class MockTTSAdapter extends TTSAdapter {
  name = 'mock-tts';
  version = '1.0.0';

  async synthesize(
    _text: string,
    _voiceConfig: VoiceConfig,
    _timestamps?: { start: number; end: number }
  ): Promise<Buffer> {
    // Simulate processing delay
    await this.delay(800);

    // Return empty buffer (in real implementation, this would be WAV audio)
    return Buffer.alloc(0);
  }

  async synthesizeSegments(
    segments: TranslationSegment[],
    _speakerVoiceMapping: SpeakerVoiceMapping
  ): Promise<TTSResult> {
    // Simulate processing delay
    await this.delay(2000);

    const audioSegments = segments.map((segment) => ({
      segmentId: segment.id,
      audioData: Buffer.alloc(0), // Mock audio data
      start: segment.start,
      end: segment.end,
      duration: segment.end - segment.start,
    }));

    return {
      audioData: Buffer.alloc(0), // Mock complete audio
      segments: audioSegments,
      metadata: {
        processingTime: 2000,
        modelName: this.name,
        modelVersion: this.version,
      },
    };
  }

  async createVoiceClone(_audioPath: string, _voiceName: string): Promise<string> {
    // Simulate processing delay
    await this.delay(3000);

    // Return mock voice clone ID
    return `mock-voice-clone-${Date.now()}`;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      latency: 40,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock Lip-Sync Adapter for testing
 */
export class MockLipSyncAdapter extends LipSyncAdapter {
  name = 'mock-lipsync';
  version = '1.0.0';

  async sync(
    _videoPath: string,
    _audioPath: string,
    outputPath: string,
    enhanceFaces: boolean = false
  ): Promise<LipSyncResult> {
    // Simulate processing delay
    await this.delay(5000);

    return {
      videoPath: outputPath,
      metadata: {
        processingTime: 5000,
        modelName: this.name,
        modelVersion: this.version,
        warnings: enhanceFaces ? [] : ['Face enhancement not applied'],
      },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: true,
      latency: 60,
      timestamp: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Example: Register mock adapters for testing
 */
export function registerMockAdapters() {
  const { modelRegistry } = require('../model-registry');

  // Register mock STT adapter
  modelRegistry.register(new MockSTTAdapter(), {
    name: 'mock-stt',
    version: '1.0.0',
    stage: 'stt',
    enabled: true,
    priority: 10,
    capabilities: {
      languages: ['en', 'es', 'fr'],
      maxDuration: 3600,
      requiresGPU: false,
      supportsBatch: false,
    },
    metadata: {
      description: 'Mock STT adapter for testing',
    },
  });

  // Register mock MT adapter
  modelRegistry.register(new MockMTAdapter(), {
    name: 'mock-mt',
    version: '1.0.0',
    stage: 'mt',
    enabled: true,
    priority: 10,
    capabilities: {
      languages: ['en', 'es', 'fr'],
      supportsBatch: true,
    },
    metadata: {
      description: 'Mock MT adapter for testing',
    },
  });

  // Register mock TTS adapter
  modelRegistry.register(new MockTTSAdapter(), {
    name: 'mock-tts',
    version: '1.0.0',
    stage: 'tts',
    enabled: true,
    priority: 10,
    capabilities: {
      languages: ['en', 'es', 'fr'],
      requiresGPU: false,
    },
    metadata: {
      description: 'Mock TTS adapter for testing',
    },
  });

  // Register mock lip-sync adapter
  modelRegistry.register(new MockLipSyncAdapter(), {
    name: 'mock-lipsync',
    version: '1.0.0',
    stage: 'lipsync',
    enabled: true,
    priority: 10,
    capabilities: {
      maxDuration: 3600,
      requiresGPU: false,
    },
    metadata: {
      description: 'Mock lip-sync adapter for testing',
    },
  });

  console.log('Mock adapters registered successfully');
}
