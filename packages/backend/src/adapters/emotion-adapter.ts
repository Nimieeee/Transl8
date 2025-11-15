/**
 * Emotion Analysis Adapter - Wav2Vec2-based Speech Emotion Recognition
 *
 * This adapter interfaces with the emotion analysis service to detect
 * emotions in audio segments. It uses a fine-tuned wav2vec2 model to
 * classify audio into emotion categories.
 *
 * Requirements: 17.1, 17.2
 */

import axios, { AxiosInstance } from 'axios';
import {
  EmotionAnalysisAdapter,
  EmotionAnalysisResult,
  EmotionTag,
  HealthCheckResult,
} from './types';
import { logger } from '../lib/logger';

export interface EmotionAdapterConfig {
  serviceUrl?: string;
  timeout?: number;
  retries?: number;
}

export class Wav2Vec2EmotionAdapter extends EmotionAnalysisAdapter {
  name = 'wav2vec2-emotion';
  version = '1.0.0';

  private client: AxiosInstance;
  private serviceUrl: string;

  constructor(config: EmotionAdapterConfig = {}) {
    super();

    this.serviceUrl =
      config.serviceUrl || process.env.EMOTION_SERVICE_URL || 'http://localhost:8010';

    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: config.timeout || 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`Emotion adapter initialized with service URL: ${this.serviceUrl}`);
  }

  /**
   * Analyze emotion in audio segment
   *
   * @param audioPath - Path to audio file (clean vocals recommended)
   * @returns Detected emotion with confidence scores
   */
  async analyzeEmotion(audioPath: string): Promise<EmotionAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info(`Analyzing emotion for audio: ${audioPath}`);

      const response = await this.client.post('/analyze', {
        audio_path: audioPath,
      });

      const data = response.data;

      // Map emotion string to EmotionTag enum
      const emotion = this.mapEmotionTag(data.emotion);

      // Map scores to EmotionTag keys
      const scores: Record<EmotionTag, number> = {} as Record<EmotionTag, number>;
      for (const [key, value] of Object.entries(data.scores)) {
        const emotionTag = this.mapEmotionTag(key);
        scores[emotionTag] = value as number;
      }

      const processingTime = Date.now() - startTime;

      const result: EmotionAnalysisResult = {
        emotion,
        confidence: data.confidence,
        scores,
        metadata: {
          processingTime,
          modelName: this.name,
          modelVersion: this.version,
          confidence: data.confidence,
        },
      };

      logger.info(`Emotion detected: ${emotion} (confidence: ${data.confidence.toFixed(3)})`);

      return result;
    } catch (error: any) {
      logger.error(`Emotion analysis error: ${error.message}`);

      // Return neutral emotion as fallback
      return this.getFallbackResult(Date.now() - startTime, error.message);
    }
  }

  /**
   * Analyze emotions for multiple audio segments in batch
   *
   * @param audioPaths - Array of audio file paths
   * @returns Array of emotion analysis results
   */
  async analyzeEmotionBatch(audioPaths: string[]): Promise<EmotionAnalysisResult[]> {
    const startTime = Date.now();

    try {
      logger.info(`Analyzing emotions for ${audioPaths.length} audio files`);

      const response = await this.client.post('/analyze_batch', {
        audio_paths: audioPaths,
      });

      const data = response.data;
      const results: EmotionAnalysisResult[] = [];

      for (const result of data.results) {
        if (result.error) {
          logger.warn(`Emotion analysis failed for segment: ${result.error}`);
          results.push(this.getFallbackResult(0, result.error));
          continue;
        }

        const emotion = this.mapEmotionTag(result.emotion);

        const scores: Record<EmotionTag, number> = {} as Record<EmotionTag, number>;
        for (const [key, value] of Object.entries(result.scores)) {
          const emotionTag = this.mapEmotionTag(key);
          scores[emotionTag] = value as number;
        }

        results.push({
          emotion,
          confidence: result.confidence,
          scores,
          metadata: {
            processingTime: result.processing_time_ms || 0,
            modelName: this.name,
            modelVersion: this.version,
            confidence: result.confidence,
          },
        });
      }

      const totalTime = Date.now() - startTime;
      logger.info(`Batch emotion analysis completed in ${totalTime}ms`);

      return results;
    } catch (error: any) {
      logger.error(`Batch emotion analysis error: ${error.message}`);

      // Return fallback results for all segments
      return audioPaths.map(() => this.getFallbackResult(0, error.message));
    }
  }

  /**
   * Health check for the emotion analysis model
   *
   * @returns Health status and latency
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/health', {
        timeout: 5000, // 5 second timeout for health check
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
          latency,
          error: response.data.error || 'Service unhealthy',
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;

      return {
        healthy: false,
        latency,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Map emotion string to EmotionTag enum
   *
   * @param emotion - Emotion string from service
   * @returns EmotionTag enum value
   */
  private mapEmotionTag(emotion: string): EmotionTag {
    const normalized = emotion.toLowerCase();

    switch (normalized) {
      case 'neutral':
        return EmotionTag.NEUTRAL;
      case 'happy':
        return EmotionTag.HAPPY;
      case 'sad':
        return EmotionTag.SAD;
      case 'angry':
        return EmotionTag.ANGRY;
      case 'excited':
        return EmotionTag.EXCITED;
      case 'fearful':
        return EmotionTag.FEARFUL;
      case 'disgusted':
        return EmotionTag.DISGUSTED;
      case 'surprised':
        return EmotionTag.SURPRISED;
      default:
        logger.warn(`Unknown emotion tag: ${emotion}, defaulting to neutral`);
        return EmotionTag.NEUTRAL;
    }
  }

  /**
   * Get fallback result when emotion analysis fails
   *
   * @param processingTime - Processing time in milliseconds
   * @param errorMessage - Error message
   * @returns Fallback emotion result (neutral)
   */
  private getFallbackResult(processingTime: number, errorMessage: string): EmotionAnalysisResult {
    const scores: Record<EmotionTag, number> = {
      [EmotionTag.NEUTRAL]: 1.0,
      [EmotionTag.HAPPY]: 0.0,
      [EmotionTag.SAD]: 0.0,
      [EmotionTag.ANGRY]: 0.0,
      [EmotionTag.EXCITED]: 0.0,
      [EmotionTag.FEARFUL]: 0.0,
      [EmotionTag.DISGUSTED]: 0.0,
      [EmotionTag.SURPRISED]: 0.0,
    };

    return {
      emotion: EmotionTag.NEUTRAL,
      confidence: 1.0,
      scores,
      metadata: {
        processingTime,
        modelName: this.name,
        modelVersion: this.version,
        confidence: 1.0,
        warnings: [`Emotion analysis failed: ${errorMessage}. Using neutral as fallback.`],
      },
    };
  }
}
