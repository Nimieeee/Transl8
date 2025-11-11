/**
 * OpenVoice Adapter
 *
 * Implements TTSAdapter interface for OpenVoice model.
 * Provides zero-shot voice cloning with style transfer from clean style prompts.
 * Supports emotion-aware synthesis for expressive dubbing.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import {
  TTSAdapter,
  VoiceConfig,
  SpeakerVoiceMapping,
  TTSResult,
  AudioSegment,
  TranslationSegment,
  HealthCheckResult,
  AdapterMetadata,
} from './types';

export interface OpenVoiceConfig {
  serviceUrl: string;
  timeout?: number;
}

export class OpenVoiceAdapter extends TTSAdapter {
  name = 'OpenVoice';
  version = '2.0.0';

  private serviceUrl: string;
  private timeout: number;

  constructor(config: OpenVoiceConfig) {
    super();
    this.serviceUrl = config.serviceUrl;
    this.timeout = config.timeout || 300000; // 5 minutes default
  }

  /**
   * Synthesize speech from text with cloned voice from clean style prompt
   * Supports emotion parameters for expressive synthesis
   */
  async synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    timestamps?: { start: number; end: number }
  ): Promise<Buffer> {
    const startTime = Date.now();

    try {
      // OpenVoice supports both preset and cloned voices
      const response = await axios.post(
        `${this.serviceUrl}/synthesize`,
        {
          text,
          voiceId: voiceConfig.voiceId,
          voiceType: voiceConfig.type,
          parameters: voiceConfig.parameters || {},
          timestamps,
        },
        {
          responseType: 'arraybuffer',
          timeout: this.timeout,
        }
      );

      const processingTime = Date.now() - startTime;

      const emotionInfo = voiceConfig.parameters?.emotion
        ? ` with emotion=${voiceConfig.parameters.emotion}`
        : '';
      console.log(
        `[OpenVoice] Synthesized ${text.length} chars in ${processingTime}ms${emotionInfo}`
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('[OpenVoice] Synthesis error:', error.message);
      throw new Error(`OpenVoice synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech for multiple segments with speaker-specific voices
   * Uses clean style prompts from Context Map for zero-shot voice cloning
   */
  async synthesizeSegments(
    segments: TranslationSegment[],
    speakerVoiceMapping: SpeakerVoiceMapping
  ): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      console.log(`[OpenVoice] Synthesizing ${segments.length} segments with voice cloning`);

      const audioSegments: AudioSegment[] = [];

      // Process each segment individually
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const voiceConfig = speakerVoiceMapping[segment.speaker];

        if (!voiceConfig) {
          throw new Error(`No voice mapping found for speaker: ${segment.speaker}`);
        }

        // Apply emotion tag to voice config if available
        const enhancedVoiceConfig = { ...voiceConfig };
        if ((segment as any).emotion) {
          enhancedVoiceConfig.parameters = {
            ...voiceConfig.parameters,
            emotion: (segment as any).emotion,
          };
        }

        // Synthesize this segment
        const audioData = await this.synthesize(segment.translatedText, enhancedVoiceConfig, {
          start: segment.start,
          end: segment.end,
        });

        audioSegments.push({
          segmentId: i,
          audioData,
          start: segment.start,
          end: segment.end,
          duration: segment.end - segment.start,
        });

        // Log progress
        if ((i + 1) % 10 === 0) {
          console.log(`[OpenVoice] Progress: ${i + 1}/${segments.length} segments`);
        }
      }

      // Concatenate all audio segments
      const concatenatedAudio = await this.concatenateAudioSegments(audioSegments, segments);

      const totalTime = Date.now() - startTime;

      const metadata: AdapterMetadata = {
        processingTime: totalTime,
        modelName: this.name,
        modelVersion: this.version,
        warnings: [],
      };

      console.log(`[OpenVoice] Completed ${segments.length} segments in ${totalTime}ms`);

      return {
        audioData: concatenatedAudio,
        segments: audioSegments,
        metadata,
      };
    } catch (error: any) {
      console.error('[OpenVoice] Batch synthesis error:', error.message);
      throw new Error(`OpenVoice batch synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech using clean style prompt for voice cloning
   * This is the core method for the robust pipeline
   */
  async synthesizeWithCleanPrompt(
    text: string,
    cleanPromptPath: string,
    targetLanguage: string,
    emotion?: string,
    timestamps?: { start: number; end: number }
  ): Promise<Buffer> {
    const startTime = Date.now();

    try {
      if (!fs.existsSync(cleanPromptPath)) {
        throw new Error(`Clean prompt file not found: ${cleanPromptPath}`);
      }

      // Create form data with reference audio for voice cloning
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', targetLanguage);
      formData.append('reference_audio', fs.createReadStream(cleanPromptPath));
      formData.append('speed', '1.0');

      // Note: emotion and timestamps are not supported by the current OpenVoice service
      // They would need to be added to the service implementation

      const response = await axios.post(`${this.serviceUrl}/synthesize-with-voice`, formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
        timeout: this.timeout,
      });

      const processingTime = Date.now() - startTime;

      const emotionInfo = emotion ? ` with emotion=${emotion}` : '';
      console.log(`[OpenVoice] Synthesized with clean prompt in ${processingTime}ms${emotionInfo}`);

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('[OpenVoice] Clean prompt synthesis error:', error.message);
      console.error('[OpenVoice] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data?.toString(),
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });
      throw new Error(`OpenVoice clean prompt synthesis failed: ${error.message}`);
    }
  }

  /**
   * Concatenate audio segments with proper timing alignment
   */
  private async concatenateAudioSegments(
    audioSegments: AudioSegment[],
    translationSegments: TranslationSegment[]
  ): Promise<Buffer> {
    const allBuffers: Buffer[] = [];

    for (let i = 0; i < audioSegments.length; i++) {
      const audioSeg = audioSegments[i];
      const transSeg = translationSegments[i];

      // Add the audio segment
      allBuffers.push(audioSeg.audioData);

      // Add silence between segments if needed
      if (i < audioSegments.length - 1) {
        const nextSeg = translationSegments[i + 1];
        const gap = nextSeg.start - transSeg.end;

        if (gap > 0.1) {
          // Add silence for gaps > 100ms
          const silenceDuration = Math.min(gap, 2.0); // Cap at 2 seconds
          const silenceBuffer = this.generateSilence(silenceDuration);
          allBuffers.push(silenceBuffer);
        }
      }
    }

    return Buffer.concat(allBuffers);
  }

  /**
   * Generate silence buffer (WAV format)
   */
  private generateSilence(duration: number): Buffer {
    const sampleRate = 24000;
    const numSamples = Math.floor(sampleRate * duration);

    // WAV header (44 bytes) + silence samples
    const dataSize = numSamples * 2; // 16-bit samples
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(fileSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
  }

  /**
   * Create a voice clone from audio sample
   */
  async createVoiceClone(
    audioPath: string,
    voiceName: string,
    language: string = 'en'
  ): Promise<string> {
    const startTime = Date.now();

    try {
      console.log(`[OpenVoice] Creating voice clone: ${voiceName}`);

      // Validate audio file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Create form data
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));
      formData.append('name', voiceName);
      formData.append('language', language);

      // Send to OpenVoice service
      const response = await axios.post(`${this.serviceUrl}/clone`, formData, {
        headers: formData.getHeaders(),
        timeout: this.timeout,
      });

      const { voiceId, processingTime } = response.data;

      console.log(`[OpenVoice] Voice clone created: ${voiceId} in ${processingTime}ms`);

      return voiceId;
    } catch (error: any) {
      console.error('[OpenVoice] Voice clone creation error:', error.message);

      if (error.response?.data?.error) {
        throw new Error(`Voice clone creation failed: ${error.response.data.error}`);
      }

      throw new Error(`Voice clone creation failed: ${error.message}`);
    }
  }

  /**
   * Get list of voice clones
   */
  async getVoiceClones(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.serviceUrl}/clones`, {
        timeout: 10000,
      });

      return response.data.clones || [];
    } catch (error: any) {
      console.error('[OpenVoice] Error fetching clones:', error.message);
      throw new Error(`Failed to fetch voice clones: ${error.message}`);
    }
  }

  /**
   * Delete a voice clone
   */
  async deleteVoiceClone(voiceId: string): Promise<void> {
    try {
      await axios.delete(`${this.serviceUrl}/clones/${voiceId}`, {
        timeout: 10000,
      });

      console.log(`[OpenVoice] Deleted voice clone: ${voiceId}`);
    } catch (error: any) {
      console.error('[OpenVoice] Error deleting clone:', error.message);
      throw new Error(`Failed to delete voice clone: ${error.message}`);
    }
  }

  /**
   * Health check for the TTS model
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 10000,
      });

      const latency = Date.now() - startTime;

      if (response.data.status === 'healthy') {
        return {
          healthy: true,
          latency,
          timestamp: new Date(),
        };
      } else {
        return {
          healthy: false,
          error: response.data.error || 'Unknown error',
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
