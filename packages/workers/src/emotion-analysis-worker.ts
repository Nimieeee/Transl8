/**
 * Emotion Analysis Worker - Processes emotion analysis jobs
 * 
 * Consumes jobs from the emotion analysis queue, analyzes emotions in
 * clean vocal prompts, and stores emotion tags in the Context Map.
 * 
 * Requirements: 17.3, 17.4
 */

import { Worker, Job } from 'bullmq';
import { EmotionAnalysisService, EmotionSegmentInfo } from '../../backend/src/lib/emotion-analysis';
import { contextMapClient } from './lib/context-map-client';
import { logger } from './lib/logger';

export interface EmotionAnalysisJobData {
  projectId: string;
  segments: EmotionSegmentInfo[];
}

export class EmotionAnalysisWorker {
  private worker: Worker;
  private emotionService: EmotionAnalysisService;
  private redisConnection: any;

  constructor(redisConnection: any) {
    this.redisConnection = redisConnection;
    this.emotionService = new EmotionAnalysisService({
      batchSize: parseInt(process.env.EMOTION_BATCH_SIZE || '10'),
      minConfidence: parseFloat(process.env.EMOTION_MIN_CONFIDENCE || '0.3'),
    });

    // Create BullMQ worker
    this.worker = new Worker<EmotionAnalysisJobData>(
      'emotion-analysis',
      async (job: Job<EmotionAnalysisJobData>) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.EMOTION_CONCURRENCY || '1'),
        limiter: {
          max: 10, // Max 10 jobs
          duration: 60000, // per minute
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process an emotion analysis job
   */
  private async processJob(job: Job<EmotionAnalysisJobData>): Promise<any> {
    const { projectId, segments } = job.data;
    const jobId = job.id!;

    logger.info(`[Emotion Analysis Worker] Processing job ${jobId} for project ${projectId}`);

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'PROCESSING', 0);
      await job.updateProgress(10);

      // Step 1: Handle edge cases (silence, very short segments)
      logger.info(`[Emotion Analysis Worker] Checking for edge cases in ${segments.length} segments`);
      const edgeCaseResults = new Map<number, any>();
      const segmentsToAnalyze: EmotionSegmentInfo[] = [];

      for (const segment of segments) {
        const edgeCase = this.emotionService.handleEdgeCase(segment);
        if (edgeCase) {
          edgeCaseResults.set(segment.id, edgeCase);
        } else {
          segmentsToAnalyze.push(segment);
        }
      }

      logger.info(
        `[Emotion Analysis Worker] ${edgeCaseResults.size} edge cases handled, ${segmentsToAnalyze.length} segments to analyze`
      );
      await job.updateProgress(20);

      // Step 2: Analyze emotions for remaining segments
      let emotionResults = new Map<number, any>();
      
      if (segmentsToAnalyze.length > 0) {
        logger.info(`[Emotion Analysis Worker] Analyzing emotions for ${segmentsToAnalyze.length} segments`);
        emotionResults = await this.emotionService.analyzeSegments(segmentsToAnalyze);
        
        const progressPerSegment = 60 / segmentsToAnalyze.length;
        await job.updateProgress(20 + (emotionResults.size * progressPerSegment));
      }

      // Combine edge case results with analyzed results
      const allResults = new Map([...edgeCaseResults, ...emotionResults]);

      logger.info(`[Emotion Analysis Worker] Total results: ${allResults.size}/${segments.length}`);
      await job.updateProgress(85);

      // Step 3: Update Context Map with emotion tags
      logger.info(`[Emotion Analysis Worker] Updating Context Map with emotion tags`);
      await this.updateContextMap(projectId, allResults);
      await job.updateProgress(95);

      // Step 4: Generate summary statistics
      const summary = this.generateSummary(allResults);
      logger.info(`[Emotion Analysis Worker] Emotion summary: ${JSON.stringify(summary)}`);

      // Step 5: Update job as completed
      await this.updateJobStatus(jobId, 'COMPLETED', 100, {
        segmentsAnalyzed: allResults.size,
        totalSegments: segments.length,
        emotionDistribution: summary,
      });

      await job.updateProgress(100);

      // Note: Adaptation is triggered by STT worker after both emotion and vocal isolation complete

      logger.info(`[Emotion Analysis Worker] Job ${jobId} completed successfully`);

      return {
        success: true,
        segmentsAnalyzed: allResults.size,
        totalSegments: segments.length,
        emotionDistribution: summary,
      };
    } catch (error: any) {
      logger.error(`[Emotion Analysis Worker] Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'FAILED', 0, undefined, error.message);
      throw error;
    }
  }

  /**
   * Update Context Map with emotion tags
   */
  private async updateContextMap(
    projectId: string,
    emotionResults: Map<number, any>
  ): Promise<void> {
    try {
      // Update each segment individually using Context Map client
      for (const [segmentId, emotionResult] of emotionResults.entries()) {
        await contextMapClient.addEmotionTag(projectId, segmentId, emotionResult.emotion);
      }

      logger.info(`Updated Context Map for project ${projectId} with emotion tags`);
    } catch (error: any) {
      logger.error(`Failed to update Context Map: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate summary statistics for emotion distribution
   */
  private generateSummary(emotionResults: Map<number, any>): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const result of emotionResults.values()) {
      const emotion = result.emotion;
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Update job status (no-op in Context Map flow)
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    progress: number,
    result?: any,
    errorMessage?: string
  ): Promise<void> {
    // In Context Map flow, job status is tracked in BullMQ, not Prisma
    logger.debug(`Job ${jobId} status: ${status} (${progress}%)`);
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info(`[Emotion Analysis Worker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`[Emotion Analysis Worker] Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('[Emotion Analysis Worker] Worker error:', err);
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
  }
}
