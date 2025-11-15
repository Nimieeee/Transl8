/**
 * Adaptation Worker
 *
 * Processes segments from Context Map using the intelligent translation adaptation engine.
 */

import { Job, Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from './lib/logger';
import { contextMapClient } from './lib/context-map-client';
import { TTSValidatedAdaptationService } from '../../backend/src/lib/tts-validated-adaptation';
import { OpenAITTSAdapter } from '../../backend/src/adapters/openai-tts-adapter';
import { AdaptationConfig } from '../../backend/src/lib/adaptation-engine';
import type { TTSJobData } from '../../backend/src/lib/queue';
import type { VoiceConfig } from '../../backend/src/adapters/types';
import path from 'path';

const prisma = new PrismaClient();

interface AdaptationJobData {
  projectId: string;
  userId: string;
  stage: 'ADAPTATION';
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
}

export class AdaptationWorker {
  private worker: Worker;
  private ttsQueue: Queue;
  private redisConnection: any;

  constructor(redisConnection?: any) {
    this.redisConnection = redisConnection || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    // Create TTS queue for triggering next stage
    this.ttsQueue = new Queue('tts', {
      connection: this.redisConnection,
    });

    this.worker = new Worker(
      'adaptation',
      async (job: Job<AdaptationJobData>) => {
        return this.processJob(job);
      },
      {
        connection: this.redisConnection,
        concurrency: 1, // Process one project at a time
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Adaptation job ${job.id} completed for project ${job.data.projectId}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Adaptation job ${job?.id} failed:`, err);
    });

    logger.info('Adaptation worker started');
  }

  /**
   * Process adaptation job
   */
  private async processJob(job: Job<AdaptationJobData>): Promise<{
    success: boolean;
    summary: string;
    stats: any;
  }> {
    const { projectId, sourceLanguage, targetLanguage, glossary } = job.data;

    logger.info(`Starting adaptation for project ${projectId}`);
    logger.info(`Language pair: ${sourceLanguage} → ${targetLanguage}`);

    try {
      // Get Context Map
      const contextMap = await contextMapClient.get(projectId);

      if (!contextMap) {
        throw new Error(`Context Map not found for project ${projectId}`);
      }

      logger.info(`Loaded Context Map with ${contextMap.segments.length} segments`);

      // Filter segments that need adaptation
      const segmentsToAdapt = contextMap.segments.filter(
        (segment: any) => !segment.adapted_text || segment.status === 'failed_adaptation'
      );

      if (segmentsToAdapt.length === 0) {
        logger.info('All segments already adapted');
        return {
          success: true,
          summary: 'All segments already adapted',
          stats: {
            total: contextMap.segments.length,
            successful: contextMap.segments.length,
            failed: 0,
            successRate: 100,
            averageAttempts: 0,
          },
        };
      }

      logger.info(`🎯 TTS-validating ${segmentsToAdapt.length} segments`);

      // Create TTS adapter for validation
      const ttsAdapter = new OpenAITTSAdapter({
        model: 'tts-1',
        defaultVoice: 'alloy',
      });

      // Create adaptation config
      const config: AdaptationConfig = {
        sourceLanguage,
        targetLanguage,
        maxRetries: 2,
        glossary,
      };

      // Create TTS-validated adaptation service
      const validationConfig = {
        maxAttempts: 10, // Increased from 3 to 10 for better accuracy
        tolerancePercent: 15, // Tighter tolerance: ±15%
        minDuration: 0.3,
        maxDuration: 30.0,
        shortSegmentThreshold: 1.0,
        shortSegmentTolerance: 30,
      };

      const ttsValidatedService = new TTSValidatedAdaptationService(
        config,
        ttsAdapter,
        validationConfig
      );

      logger.info(
        `Using TTS-validated adaptation (±${validationConfig.tolerancePercent}% tolerance)`
      );

      // Update job progress
      await job.updateProgress(10);

      // Create output directory for validated audio
      const outputDir = path.join(process.cwd(), 'temp', projectId, 'tts-output');
      const fs = await import('fs');
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Process segments with TTS validation
      const results = [];
      for (let i = 0; i < segmentsToAdapt.length; i++) {
        const segment: any = segmentsToAdapt[i];

        logger.info(
          `\n📝 TTS-validating segment ${i}/${segmentsToAdapt.length}: "${segment.text?.substring(0, 50)}..." (${segment.duration?.toFixed(1)}s)`
        );

        try {
          // Voice config (basic for now)
          const voiceConfig: VoiceConfig = {
            type: 'preset' as const,
            voiceId: 'alloy',
            parameters: {
              emotion: segment.emotion || 'neutral',
            },
          };

          const result = await ttsValidatedService.adaptSegmentWithTTSValidation(
            segment,
            voiceConfig,
            targetLanguage
          );

          results.push(result);

          if (result.status === 'success') {
            logger.info(
              `   ✅ SUCCESS: "${result.adaptedText.substring(0, 50)}..." (${result.actualDuration.toFixed(2)}s, ${result.attempts} attempts)`
            );
          } else {
            logger.warn(
              `   ⚠️  FAILED: Using best attempt "${result.adaptedText.substring(0, 50)}..." (${result.actualDuration.toFixed(2)}s, ${result.attempts} attempts)`
            );
          }

          // Update progress
          const progress = 10 + Math.floor(((i + 1) / segmentsToAdapt.length) * 70);
          await job.updateProgress(progress);
        } catch (error) {
          logger.error(`   ❌ ERROR in segment ${i}:`, error);
          // Use fallback with proper type
          results.push({
            adaptedText: segment.text,
            audioPath: '',
            actualDuration: segment.duration,
            targetDuration: segment.duration,
            attempts: 1,
            status: 'failed' as const,
            validationHistory: [],
          });
        }
      }

      // Update job progress
      await job.updateProgress(80);

      // Update Context Map with TTS-validated results
      logger.info('\n📊 Updating Context Map with TTS-validated results');

      for (let i = 0; i < segmentsToAdapt.length; i++) {
        const segment: any = segmentsToAdapt[i];
        const result = results[i];

        logger.info(
          `   Updating segment ${segment.id}: "${result.adaptedText.substring(0, 50)}..."`
        );

        await contextMapClient.addAdaptedText(
          projectId,
          segment.id,
          result.adaptedText,
          result.status as any,
          result.attempts,
          `Duration: ${result.actualDuration.toFixed(2)}s (target: ${result.targetDuration.toFixed(2)}s)`
        );

        // Store validated audio path if available
        if (result.audioPath && result.status === 'success') {
          // Update segment with validated audio path
          await contextMapClient.addGeneratedAudioPath(projectId, segment.id, result.audioPath);
        }
      }

      // Update job progress
      await job.updateProgress(90);

      // Wait a moment to ensure all database updates are committed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logger.info('✅ All Context Map updates committed');

      // Generate comprehensive report
      const report = ttsValidatedService.generateValidationReport(results);
      logger.info('\n' + report);

      // Calculate stats
      const successful = results.filter((r) => r.status === 'success').length;
      const failed = results.filter((r) => r.status === 'failed').length;
      const successRate = (successful / results.length) * 100;
      const avgAttempts = results.reduce((sum, r) => sum + r.attempts, 0) / results.length;
      const totalTTSCalls = results.reduce((sum, r) => sum + r.attempts, 0);

      const stats = {
        total: results.length,
        successful,
        failed,
        successRate,
        averageAttempts: avgAttempts,
        totalTTSCalls,
      };

      const summary = `TTS-Validated Adaptation: ${successful}/${results.length} successful (${successRate.toFixed(1)}%), ${totalTTSCalls} TTS calls`;

      logger.info(summary);

      // Update job progress
      await job.updateProgress(95);

      // Trigger TTS if adaptation was successful (66% threshold allows 2/3 segments)
      if (stats.successRate >= 66) {
        logger.info(
          `\n🚀 TTS-validated adaptation complete (${stats.successRate.toFixed(1)}% success), triggering TTS assembly`
        );
        logger.info(`   📊 Total TTS validation calls: ${stats.totalTTSCalls}`);
        if (stats.successRate < 100) {
          logger.warn(
            `   ⚠️  Some segments using best attempt (will be trimmed in final assembly)`
          );
        }
        await this.triggerTTSStage(projectId, job.data.userId, targetLanguage);
      } else {
        logger.warn(
          `\n⚠️  TTS-validated adaptation success rate too low (${stats.successRate.toFixed(1)}%), not triggering TTS. ` +
            `Manual review required.`
        );
      }

      await job.updateProgress(100);

      return {
        success: stats.failed === 0,
        summary,
        stats,
      };
    } catch (error) {
      logger.error(`Adaptation job failed for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger TTS stage after successful adaptation
   */
  private async triggerTTSStage(
    projectId: string,
    userId: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      // Get project voice configuration (for MVP, use default config)
      const voiceConfig = {};

      // Enqueue TTS job
      const ttsJobData: TTSJobData = {
        projectId,
        userId,
        stage: 'TTS',
        translationId: projectId, // Use projectId as translationId for Context Map-based flow
        voiceConfig,
        targetLanguage,
      };

      await this.ttsQueue.add(`tts-${projectId}`, ttsJobData, {
        priority: 1, // High priority
      });

      logger.info(`[Adaptation Worker] Enqueued TTS job for project ${projectId}`);
    } catch (error: any) {
      logger.error(`[Adaptation Worker] Failed to trigger TTS stage:`, error);
      throw error;
    }
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.ttsQueue.close();
    await prisma.$disconnect();
    logger.info('Adaptation worker closed');
  }
}

// Start worker if run directly
if (require.main === module) {
  const worker = new AdaptationWorker();

  // Handle shutdown gracefully
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
}

export default AdaptationWorker;
