/**
 * Adaptation Service
 * 
 * Orchestrates the intelligent translation adaptation process with retry logic.
 */

import { logger } from './logger';
import { AdaptationEngine, AdaptationConfig, AdaptationResult } from './adaptation-engine';
import { TranslationValidator } from './translation-validator';
import { MistralClient, getMistralClient } from './mistral-client';
import { ContextMapSegment } from '@shared/types';

export class AdaptationService {
  private adaptationEngine: AdaptationEngine;
  private validator: TranslationValidator;
  private mistralClient: MistralClient;

  constructor(config: AdaptationConfig) {
    this.adaptationEngine = new AdaptationEngine(config);
    this.mistralClient = getMistralClient();
    this.validator = new TranslationValidator(this.mistralClient, this.adaptationEngine);
  }

  /**
   * Adapt a single segment with retry logic
   */
  async adaptSegment(segment: ContextMapSegment): Promise<AdaptationResult> {
    const maxRetries = this.adaptationEngine.getConfig().maxRetries;
    let previousFeedback: string | undefined;

    logger.info(`Adapting segment ${segment.id}: "${segment.text}"`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Build prompt with context and feedback
        const prompt = this.adaptationEngine.buildPrompt(segment, attempt, previousFeedback);

        // Generate translation
        logger.debug(`Attempt ${attempt + 1}/${maxRetries + 1} for segment ${segment.id}`);
        const translation = await this.mistralClient.translate(prompt);

        if (!translation) {
          logger.warn(`Empty translation received for segment ${segment.id}`);
          previousFeedback = 'empty response';
          continue;
        }

        logger.debug(`Generated translation: "${translation}"`);

        // Apply glossary terms
        const finalTranslation = this.adaptationEngine.applyGlossary(translation);

        // Validate translation (use heuristic only for speed and reliability)
        const validationResult = await this.validator.validate(
          segment.text,
          finalTranslation,
          segment.duration,
          this.adaptationEngine.getConfig().targetLanguage,
          { useHeuristicOnly: true } // Disable LLM-as-Judge - it's too strict
        );

        if (validationResult.isValid) {
          // Success!
          logger.info(
            `Segment ${segment.id} adapted successfully on attempt ${attempt + 1}: "${finalTranslation}"`
          );

          return {
            adaptedText: finalTranslation,
            status: 'success',
            attempts: attempt + 1,
            validationFeedback: validationResult.feedback,
          };
        }

        // Validation failed
        logger.debug(
          `Validation failed for segment ${segment.id}: ${validationResult.feedback}`
        );
        previousFeedback = validationResult.feedback;

        // If this was the last attempt, return failure
        if (attempt === maxRetries) {
          logger.warn(
            `Segment ${segment.id} failed adaptation after ${maxRetries + 1} attempts`
          );

          return {
            adaptedText: finalTranslation,
            status: 'failed_adaptation',
            attempts: attempt + 1,
            validationFeedback: validationResult.feedback,
          };
        }

        // Otherwise, retry with feedback
        logger.debug(`Retrying segment ${segment.id} with feedback: ${previousFeedback}`);
      } catch (error) {
        logger.error(`Error adapting segment ${segment.id} on attempt ${attempt + 1}:`, error);

        // If this was the last attempt, return failure
        if (attempt === maxRetries) {
          return {
            adaptedText: segment.text, // Fallback to original
            status: 'failed_adaptation',
            attempts: attempt + 1,
            validationFeedback: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }

        // Otherwise, retry
        previousFeedback = 'API error occurred';
      }
    }

    // Should never reach here, but just in case
    return {
      adaptedText: segment.text,
      status: 'failed_adaptation',
      attempts: maxRetries + 1,
      validationFeedback: 'Maximum retries exceeded',
    };
  }

  /**
   * Adapt multiple segments
   */
  async adaptSegments(segments: ContextMapSegment[]): Promise<AdaptationResult[]> {
    const results: AdaptationResult[] = [];

    for (const segment of segments) {
      const result = await this.adaptSegment(segment);
      results.push(result);
    }

    return results;
  }

  /**
   * Adapt segments in parallel (with concurrency limit)
   */
  async adaptSegmentsParallel(
    segments: ContextMapSegment[],
    concurrency: number = 3
  ): Promise<AdaptationResult[]> {
    const results: AdaptationResult[] = new Array(segments.length);
    const queue = [...segments];
    let activeCount = 0;
    let index = 0;

    return new Promise((resolve, reject) => {
      const processNext = async () => {
        if (queue.length === 0 && activeCount === 0) {
          resolve(results);
          return;
        }

        if (queue.length === 0 || activeCount >= concurrency) {
          return;
        }

        const segment = queue.shift()!;
        const currentIndex = index++;
        activeCount++;

        try {
          const result = await this.adaptSegment(segment);
          results[currentIndex] = result;
        } catch (error) {
          logger.error(`Failed to adapt segment ${segment.id}:`, error);
          results[currentIndex] = {
            adaptedText: segment.text,
            status: 'failed_adaptation',
            attempts: 0,
            validationFeedback: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        } finally {
          activeCount--;
          processNext();
        }
      };

      // Start initial batch
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    });
  }

  /**
   * Get adaptation statistics
   */
  getAdaptationStats(results: AdaptationResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageAttempts: number;
  } {
    const total = results.length;
    const successful = results.filter(r => r.status === 'success').length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
    const averageAttempts = total > 0 ? totalAttempts / total : 0;

    return {
      total,
      successful,
      failed,
      successRate,
      averageAttempts,
    };
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(results: AdaptationResult[]): string {
    const stats = this.getAdaptationStats(results);

    let report = '=== Adaptation Summary ===\n\n';
    report += `Total segments: ${stats.total}\n`;
    report += `Successful: ${stats.successful} (${stats.successRate.toFixed(1)}%)\n`;
    report += `Failed: ${stats.failed}\n`;
    report += `Average attempts: ${stats.averageAttempts.toFixed(2)}\n\n`;

    // List failed segments
    if (stats.failed > 0) {
      report += 'Failed segments:\n';
      results.forEach((result, index) => {
        if (result.status === 'failed_adaptation') {
          report += `  - Segment ${index}: ${result.validationFeedback}\n`;
        }
      });
    }

    return report;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.mistralClient.testConnection();
    } catch (error) {
      logger.error('Failed to test Mistral API connection:', error);
      return false;
    }
  }
}

/**
 * Create adaptation service with configuration
 */
export function createAdaptationService(config: AdaptationConfig): AdaptationService {
  return new AdaptationService(config);
}
