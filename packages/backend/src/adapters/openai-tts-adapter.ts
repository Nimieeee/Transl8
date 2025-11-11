/**
 * OpenAI TTS Adapter
 * 
 * Adapter for OpenAI's Text-to-Speech API
 * Supports multiple voices and languages
 */

import OpenAI from 'openai';
import type { TTSAdapter, TTSResult, SpeakerVoiceMapping, VoiceConfig } from './types';

export interface OpenAITTSConfig {
  apiKey?: string;
  model?: 'tts-1' | 'tts-1-hd';
  defaultVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

export class OpenAITTSAdapter implements TTSAdapter {
  name = 'openai-tts';
  version = '1.0.0';
  private client: OpenAI;
  private model: 'tts-1' | 'tts-1-hd';
  private defaultVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

  constructor(config: OpenAITTSConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || 'tts-1';
    this.defaultVoice = config.defaultVoice || 'alloy';
  }

  /**
   * Synthesize multiple segments with speaker-specific voices
   */
  async synthesizeSegments(
    segments: any[],
    speakerVoiceMapping: SpeakerVoiceMapping
  ): Promise<TTSResult> {
    const startTime = Date.now();
    const audioSegments: any[] = [];
    const warnings: string[] = [];

    console.log(`[OpenAI TTS] Synthesizing ${segments.length} segments`);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const voiceConfig = speakerVoiceMapping[segment.speaker];

      if (!voiceConfig) {
        warnings.push(`No voice config for speaker ${segment.speaker}, using default`);
      }

      try {
        const voice = this.getVoiceFromConfig(voiceConfig);
        const speed = voiceConfig?.parameters?.speed || 1.0;

        console.log(`[OpenAI TTS] Segment ${i}: "${segment.translatedText.substring(0, 50)}..." (voice: ${voice}, speed: ${speed})`);

        const audioData = await this.synthesize(
          segment.translatedText,
          voice,
          speed
        );

        audioSegments.push({
          segmentId: i,
          audioData,
          start: segment.start,
          end: segment.end,
          duration: segment.end - segment.start,
        });

        console.log(`[OpenAI TTS] Segment ${i} completed`);
      } catch (error: any) {
        console.error(`[OpenAI TTS] Failed to synthesize segment ${i}:`, error.message);
        warnings.push(`Failed to synthesize segment ${i}: ${error.message}`);
      }
    }

    // Concatenate all audio segments
    const concatenatedAudio = Buffer.concat(audioSegments.map(s => s.audioData));

    const totalTime = Date.now() - startTime;

    return {
      audioData: concatenatedAudio,
      segments: audioSegments,
      metadata: {
        processingTime: totalTime,
        modelName: this.name,
        modelVersion: this.version,
        warnings,
      },
    };
  }

  /**
   * Synthesize a single text with OpenAI TTS
   */
  async synthesize(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
    speed: number = 1.0
  ): Promise<Buffer> {
    try {
      const response = await this.client.audio.speech.create({
        model: this.model,
        voice,
        input: text,
        speed: Math.max(0.25, Math.min(4.0, speed)), // Clamp speed between 0.25 and 4.0
        response_format: 'wav',
      });

      // Convert response to buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      console.error('[OpenAI TTS] Synthesis error:', error);
      throw new Error(`OpenAI TTS synthesis failed: ${error.message}`);
    }
  }

  /**
   * Get OpenAI voice from voice config
   */
  private getVoiceFromConfig(config?: VoiceConfig): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    if (!config || !config.voiceId) {
      return this.defaultVoice;
    }

    // Map voice IDs to OpenAI voices
    const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
      'alloy': 'alloy',
      'echo': 'echo',
      'fable': 'fable',
      'onyx': 'onyx',
      'nova': 'nova',
      'shimmer': 'shimmer',
      // Fallback mappings
      'male': 'onyx',
      'female': 'nova',
      'neutral': 'alloy',
    };

    const voiceId = config.voiceId.toLowerCase();
    return voiceMap[voiceId] || this.defaultVoice;
  }

  /**
   * Health check for OpenAI TTS service
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Try a minimal synthesis to check if API is working
      await this.synthesize('test', this.defaultVoice, 1.0);
      return { healthy: true };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}
