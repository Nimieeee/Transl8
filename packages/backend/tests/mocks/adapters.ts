import { STTAdapter, TTSAdapter, VocalIsolationAdapter, EmotionAnalysisAdapter } from '../../src/adapters/types';

// Mock OpenAI Whisper Adapter
export class MockOpenAIWhisperAdapter implements STTAdapter {
  async transcribe(audioPath: string, language: string): Promise<any> {
    return {
      text: 'Mock transcription text',
      duration: 10.5,
      language,
      segments: [
        {
          id: 0,
          start: 0.0,
          end: 5.0,
          text: 'Mock transcription text',
          speaker: 'SPEAKER_00',
          confidence: 0.95,
          words: [
            { word: 'Mock', start: 0.0, end: 1.0, confidence: 0.96 },
            { word: 'transcription', start: 1.0, end: 3.0, confidence: 0.94 },
            { word: 'text', start: 3.0, end: 5.0, confidence: 0.95 },
          ],
        },
      ],
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Mock OpenVoice Adapter
export class MockOpenVoiceAdapter implements TTSAdapter {
  async synthesize(
    text: string,
    voiceId: string,
    language: string,
    parameters?: any
  ): Promise<Buffer> {
    return Buffer.from('mock-cloned-audio-data');
  }

  async cloneVoice(audioPath: string, language: string): Promise<any> {
    return {
      voiceId: 'cloned-voice-123',
      embeddings: [0.1, 0.2, 0.3],
      quality: 0.92,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Mock Demucs Adapter
export class MockDemucsAdapter implements VocalIsolationAdapter {
  async isolateVocals(audioPath: string, outputPath: string): Promise<string> {
    return outputPath;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Mock Noisereduce Adapter
export class MockNoisereduceAdapter implements VocalIsolationAdapter {
  async isolateVocals(audioPath: string, outputPath: string): Promise<string> {
    return outputPath;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Mock Emotion Analysis Adapter
export class MockEmotionAdapter implements EmotionAnalysisAdapter {
  async analyzeEmotion(audioPath: string): Promise<any> {
    return {
      segments: [
        { start: 0.0, end: 5.0, emotion: 'neutral', confidence: 0.85 },
      ],
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Backward compatibility aliases
export const MockWhisperPyannoteAdapter = MockOpenAIWhisperAdapter;

// Mock adapter that simulates failures
export class FailingSTTAdapter implements STTAdapter {
  async transcribe(audioPath: string, language: string): Promise<any> {
    throw new Error('STT service unavailable');
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

export class LowConfidenceSTTAdapter implements STTAdapter {
  async transcribe(audioPath: string, language: string): Promise<any> {
    return {
      text: 'Low quality transcription',
      duration: 10.5,
      language,
      segments: [
        {
          id: 0,
          start: 0.0,
          end: 5.0,
          text: 'Low quality transcription',
          speaker: 'SPEAKER_00',
          confidence: 0.45, // Low confidence
          words: [
            { word: 'Low', start: 0.0, end: 1.0, confidence: 0.40 },
            { word: 'quality', start: 1.0, end: 3.0, confidence: 0.42 },
            { word: 'transcription', start: 3.0, end: 5.0, confidence: 0.52 },
          ],
        },
      ],
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
