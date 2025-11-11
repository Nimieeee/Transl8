/**
 * Vocal Isolation Worker - Processes vocal isolation jobs
 * 
 * Consumes jobs from the vocal isolation queue, extracts audio segments,
 * separates vocals from music/effects using Demucs, removes noise,
 * and stores clean style prompts in the Context Map.
 * 
 * Requirements: 16.4, 16.5
 */

import { Worker, Job, Queue } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { VocalIsolationService, AudioSegmentInfo } from '../../backend/src/lib/vocal-isolation';
import { contextMapClient } from './lib/context-map-client';
import { logger } from './lib/logger';
import type { TTSJobData } from '../../backend/src/lib/queue';

export interface VocalIsolationJobData {
  projectId: string;
  audioUrl: string;
  segments: AudioSegmentInfo[];
  outputDir: string;
}

export class VocalIsolationWorker {
  private worker: Worker;
  private vocalIsolationService: VocalIsolationService;
  private ttsQueue: Queue;
  private redisConnection: any;

  constructor(redisConnection: any) {
    this.redisConnection = redisConnection;
    this.vocalIsolationService = new VocalIsolationService({
      tempDir: process.env.VOCAL_ISOLATION_TEMP_DIR || '/tmp/vocal-isolation',
    });

    // Create TTS queue for triggering next stage
    this.ttsQueue = new Queue('tts', {
      connection: redisConnection,
    });

    // Create BullMQ worker
    this.worker = new Worker<VocalIsolationJobData>(
      'vocal-isolation',
      async (job: Job<VocalIsolationJobData>) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.VOCAL_ISOLATION_CONCURRENCY || '1'),
        limiter: {
          max: 5, // Max 5 jobs
          duration: 60000, // per minute
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process a vocal isolation job
   */
  private async processJob(job: Job<VocalIsolationJobData>): Promise<any> {
    const { projectId, audioUrl, segments, outputDir } = job.data;
    const jobId = job.id!;

    logger.info(`[Vocal Isolation Worker] Processing job ${jobId} for project ${projectId}`);

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'PROCESSING', 0);
      await job.updateProgress(10);

      // Step 1: Download audio file from storage
      logger.info(`[Vocal Isolation Worker] Downloading audio from ${audioUrl}`);
      const audioPath = await this.downloadAudio(audioUrl, projectId);
      await job.updateProgress(20);

      // Step 2: Process segments - extract, separate vocals, reduce noise
      logger.info(`[Vocal Isolation Worker] Processing ${segments.length} segments`);
      const cleanPromptPaths = await this.vocalIsolationService.processSegments(
        audioPath,
        segments,
        outputDir
      );
      
      const progressPerSegment = 60 / segments.length;
      await job.updateProgress(20 + (cleanPromptPaths.size * progressPerSegment));

      // Step 3: Update Context Map with clean prompt paths
      logger.info(`[Vocal Isolation Worker] Updating Context Map`);
      await this.updateContextMap(projectId, cleanPromptPaths);
      await job.updateProgress(90);

      // Step 4: Clean up temporary audio file
      await this.cleanupTempFile(audioPath);

      // Step 5: Update job as completed
      await this.updateJobStatus(jobId, 'COMPLETED', 100, {
        segmentsProcessed: cleanPromptPaths.size,
        totalSegments: segments.length,
      });

      await job.updateProgress(100);

      // Check if adaptation is complete and trigger TTS if ready
      await this.checkAndTriggerTTS(projectId);

      logger.info(`[Vocal Isolation Worker] Job ${jobId} completed successfully`);

      return {
        success: true,
        segmentsProcessed: cleanPromptPaths.size,
        totalSegments: segments.length,
      };
    } catch (error: any) {
      logger.error(`[Vocal Isolation Worker] Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'FAILED', 0, undefined, error.message);
      throw error;
    }
  }

  /**
   * Download audio file from storage URL
   */
  private async downloadAudio(audioUrl: string, projectId: string): Promise<string> {
    try {
      // For local development, audioUrl might be a file path
      if (audioUrl.startsWith('/') || audioUrl.startsWith('file://')) {
        const localPath = audioUrl.replace('file://', '');
        if (fs.existsSync(localPath)) {
          return localPath;
        }
      }

      // For production, download from S3/GCS
      const axios = require('axios');
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minute timeout
      });

      const tempDir = '/tmp/vocal-isolation-downloads';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const audioPath = path.join(tempDir, `${projectId}_audio.wav`);
      fs.writeFileSync(audioPath, response.data);

      return audioPath;
    } catch (error: any) {
      logger.error(`Failed to download audio: ${error.message}`);
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Update Context Map with clean prompt paths
   */
  private async updateContextMap(
    projectId: string,
    cleanPromptPaths: Map<number, string>
  ): Promise<void> {
    try {
      // Update each segment individually using Context Map client
      for (const [segmentId, cleanPath] of cleanPromptPaths.entries()) {
        await contextMapClient.addCleanPromptPath(projectId, segmentId, cleanPath);
      }

      logger.info(`Updated Context Map for project ${projectId}`);
    } catch (error: any) {
      logger.error(`Failed to update Context Map: ${error.message}`);
      throw error;
    }
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
   * Check if adaptation is complete and trigger TTS
   */
  private async checkAndTriggerTTS(projectId: string): Promise<void> {
    try {
      const contextMap = await contextMapClient.get(projectId);
      
      if (!contextMap || !contextMap.segments) {
        logger.info(`[Vocal Isolation Worker] Context Map not found for project ${projectId}`);
        return;
      }

      // Check if all segments have adapted text
      const segmentsWithAdaptedText = contextMap.segments.filter(
        (s: any) => s.adapted_text
      );

      if (segmentsWithAdaptedText.length !== contextMap.segments.length) {
        logger.info(`[Vocal Isolation Worker] Adaptation not yet complete (${segmentsWithAdaptedText.length}/${contextMap.segments.length} segments)`);
        return;
      }

      logger.info(`[Vocal Isolation Worker] Both vocal isolation and adaptation complete, triggering TTS`);

      // Enqueue TTS job
      const ttsJobData: TTSJobData = {
        projectId,
        userId: contextMap.user_id || 'system',
        stage: 'TTS',
        translationId: projectId,
        voiceConfig: {},
        targetLanguage: contextMap.target_language || 'es',
      };

      await this.ttsQueue.add(
        `tts-${projectId}`,
        ttsJobData,
        {
          priority: 1,
        }
      );

      logger.info(`[Vocal Isolation Worker] Enqueued TTS job for project ${projectId}`);
    } catch (error: any) {
      logger.error(`[Vocal Isolation Worker] Failed to trigger TTS:`, error);
      // Don't throw - this shouldn't fail the vocal isolation job
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath) && filePath.includes('/tmp/')) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error: any) {
      logger.error(`Failed to cleanup temp file: ${error.message}`);
    }
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info(`[Vocal Isolation Worker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`[Vocal Isolation Worker] Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('[Vocal Isolation Worker] Worker error:', err);
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.ttsQueue.close();
    this.vocalIsolationService.cleanup();
  }
}
