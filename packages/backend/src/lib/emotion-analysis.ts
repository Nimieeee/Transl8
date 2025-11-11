/**
 * Emotion Analysis Service
 * 
 * Service for analyzing emotions in audio segments using wav2vec2-based
 * Speech Emotion Recognition. Processes clean vocal prompts and tags
 * segments with detected emotions.
 * 
 * Requirements: 17.3, 17.4
 */

import { Wav2Vec2EmotionAdapter } from '../adapters/emotion-adapter';
import { EmotionTag, EmotionAnalysisResult } from '../adapters/types';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';

export interface EmotionSegmentInfo {
  id: number;
  cleanPromptPath: string;
  text: string;
  speaker: string;
}

export interface EmotionAnalysisOptions {
  batchSize?: number;
  fallbackEmotion?: EmotionTag;
  minConfidence?: number;
}

export interface SegmentEmotionResult {
  segmentId: number;
  emotion: EmotionTag;
  confidence: number;
  scores: Record<EmotionTag, number>;
  processingTime: number;
}

export class EmotionAnalysisService {
  private emotionAdapter: Wav2Vec2EmotionAdapter;
  private batchSize: number;
  private fallbackEmotion: EmotionTag;
  private minConfidence: number;

  constructor(options: EmotionAnalysisOptions = {}) {
    this.emotionAdapter = new Wav2Vec2EmotionAdapter();
    this.batchSize = options.batchSize || 10;
    this.fallbackEmotion = options.fallbackEmotion || EmotionTag.NEUTRAL;
    this.minConfidence = options.minConfidence || 0.3;

    logger.info('Emotion analysis service initialized');
  }

  /**
   * Analyze emotion for a single segment
   * 
   * @param segment - Segment information with clean prompt path
   * @returns Emotion analysis result
   */
  async analyzeSegment(segment: EmotionSegmentInfo): Promise<SegmentEmotionResult> {
    try {
      // Verify clean prompt file exists
      if (!fs.existsSync(segment.cleanPromptPath)) {
        logger.warn(`Clean prompt not found for segment ${segment.id}: ${segment.cleanPromptPath}`);
        return this.getFallbackResult(segment.id, 'Clean prompt file not found');
      }

      // Analyze emotion
      const result = await this.emotionAdapter.analyzeEmotion(segment.cleanPromptPath);

      // Check confidence threshold
      let emotion = result.emotion;
      let confidence = result.confidence;

      if (confidence < this.minConfidence) {
        logger.warn(
          `Low confidence (${confidence.toFixed(3)}) for segment ${segment.id}, using fallback emotion`
        );
        emotion = this.fallbackEmotion;
        confidence = 1.0;
      }

      logger.info(
        `Segment ${segment.id}: emotion=${emotion}, confidence=${confidence.toFixed(3)}`
      );

      return {
        segmentId: segment.id,
        emotion,
        confidence,
        scores: result.scores,
        processingTime: result.metadata.processingTime,
      };
    } catch (error: any) {
      logger.error(`Emotion analysis error for segment ${segment.id}: ${error.message}`);
      return this.getFallbackResult(segment.id, error.message);
    }
  }

  /**
   * Analyze emotions for multiple segments in batch
   * 
   * @param segments - Array of segment information
   * @returns Map of segment IDs to emotion results
   */
  async analyzeSegments(
    segments: EmotionSegmentInfo[]
  ): Promise<Map<number, SegmentEmotionResult>> {
    const results = new Map<number, SegmentEmotionResult>();

    logger.info(`Analyzing emotions for ${segments.length} segments`);

    // Process in batches
    for (let i = 0; i < segments.length; i += this.batchSize) {
      const batch = segments.slice(i, i + this.batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(segments.length / this.batchSize)}`);

      // Filter segments with valid clean prompt paths
      const validSegments = batch.filter((seg) => {
        if (!fs.existsSync(seg.cleanPromptPath)) {
          logger.warn(`Clean prompt not found for segment ${seg.id}: ${seg.cleanPromptPath}`);
          results.set(seg.id, this.getFallbackResult(seg.id, 'Clean prompt file not found'));
          return false;
        }
        return true;
      });

      if (validSegments.length === 0) {
        continue;
      }

      try {
        // Batch analyze
        const audioPaths = validSegments.map((seg) => seg.cleanPromptPath);
        const batchResults = await this.emotionAdapter.analyzeEmotionBatch(audioPaths);

        // Map results to segments
        for (let j = 0; j < validSegments.length; j++) {
          const segment = validSegments[j];
          const result = batchResults[j];

          let emotion = result.emotion;
          let confidence = result.confidence;

          // Check confidence threshold
          if (confidence < this.minConfidence) {
            logger.warn(
              `Low confidence (${confidence.toFixed(3)}) for segment ${segment.id}, using fallback`
            );
            emotion = this.fallbackEmotion;
            confidence = 1.0;
          }

          results.set(segment.id, {
            segmentId: segment.id,
            emotion,
            confidence,
            scores: result.scores,
            processingTime: result.metadata.processingTime,
          });
        }
      } catch (error: any) {
        logger.error(`Batch emotion analysis error: ${error.message}`);
        
        // Add fallback results for failed batch
        for (const segment of validSegments) {
          if (!results.has(segment.id)) {
            results.set(segment.id, this.getFallbackResult(segment.id, error.message));
          }
        }
      }
    }

    logger.info(`Completed emotion analysis for ${results.size}/${segments.length} segments`);

    return results;
  }

  /**
   * Handle edge cases for emotion analysis
   * 
   * @param segment - Segment information
   * @returns Emotion result or null if segment should be skipped
   */
  handleEdgeCase(segment: EmotionSegmentInfo): SegmentEmotionResult | null {
    // Handle silence (very short segments)
    if (!segment.text || segment.text.trim().length === 0) {
      logger.info(`Segment ${segment.id} is silent, using neutral emotion`);
      return {
        segmentId: segment.id,
        emotion: EmotionTag.NEUTRAL,
        confidence: 1.0,
        scores: this.getNeutralScores(),
        processingTime: 0,
      };
    }

    // Handle very short text (likely not enough for emotion detection)
    if (segment.text.trim().split(/\s+/).length < 3) {
      logger.info(`Segment ${segment.id} has very short text, using neutral emotion`);
      return {
        segmentId: segment.id,
        emotion: EmotionTag.NEUTRAL,
        confidence: 1.0,
        scores: this.getNeutralScores(),
        processingTime: 0,
      };
    }

    return null;
  }

  /**
   * Get fallback result when emotion analysis fails
   * 
   * @param segmentId - Segment ID
   * @param reason - Reason for fallback
   * @returns Fallback emotion result
   */
  private getFallbackResult(segmentId: number, reason: string): SegmentEmotionResult {
    logger.warn(`Using fallback emotion for segment ${segmentId}: ${reason}`);
    
    return {
      segmentId,
      emotion: this.fallbackEmotion,
      confidence: 1.0,
      scores: this.getNeutralScores(),
      processingTime: 0,
    };
  }

  /**
   * Get neutral emotion scores
   * 
   * @returns Scores with neutral at 1.0 and others at 0.0
   */
  private getNeutralScores(): Record<EmotionTag, number> {
    return {
      [EmotionTag.NEUTRAL]: 1.0,
      [EmotionTag.HAPPY]: 0.0,
      [EmotionTag.SAD]: 0.0,
      [EmotionTag.ANGRY]: 0.0,
      [EmotionTag.EXCITED]: 0.0,
      [EmotionTag.FEARFUL]: 0.0,
      [EmotionTag.DISGUSTED]: 0.0,
      [EmotionTag.SURPRISED]: 0.0,
    };
  }

  /**
   * Health check for emotion analysis service
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.emotionAdapter.healthCheck();
      return health.healthy;
    } catch (error) {
      return false;
    }
  }
}
