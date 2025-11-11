/**
 * STT Worker - Processes speech-to-text jobs
 *
 * Consumes jobs from the STT queue, downloads audio from storage,
 * runs transcription with speaker diarization, stores results in database,
 * and triggers the next pipeline stage.
 *
 * Requirements: 2.5, 6.3
 */

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OpenAIWhisperAdapter } from '../../backend/src/adapters/openai-whisper-adapter';
import { contextMapService } from '../../backend/src/lib/context-map';
import type { STTJobData } from '../../backend/src/lib/queue';
import type { STTResult, STTAdapter } from '../../backend/src/adapters/types';

const execAsync = promisify(exec);
// Vocal isolation removed - using OpenAI TTS without voice cloning
import { logger } from './lib/logger';

const prisma = new PrismaClient();

export class STTWorker {
  private worker: Worker;
  private adapter: STTAdapter;
  private adaptationQueue: Queue;
  private redisConnection: any;

  constructor(redisConnection: any) {
    this.redisConnection = redisConnection;

    // Use OpenAI Whisper API adapter
    logger.info('[STT Worker] Using OpenAI Whisper API adapter');
    this.adapter = new OpenAIWhisperAdapter();

    // Create queue for adaptation stage

    // Create adaptation queue for triggering translation
    this.adaptationQueue = new Queue('adaptation', {
      connection: redisConnection,
    });

    // Create BullMQ worker
    this.worker = new Worker<STTJobData>(
      'stt',
      async (job: Job<STTJobData>) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
        limiter: {
          max: 10, // Max 10 jobs
          duration: 60000, // per minute
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process an STT job
   */
  private async processJob(job: Job<STTJobData>): Promise<any> {
    const { projectId, videoPath, sourceLanguage } = job.data;
    const jobId = job.id!;

    logger.info(`[STT Worker] Processing job ${jobId} for project ${projectId}`);

    try {
      // Update job status to processing (use projectId for database)
      await this.updateJobStatus(projectId, 'PROCESSING', 0);
      await job.updateProgress(10);

      // Step 1: Extract audio from video file
      logger.info(`[STT Worker] Extracting audio from video: ${videoPath}`);
      const audioPath = await this.extractAudio(videoPath, projectId);
      await job.updateProgress(15);

      // Step 1.5: Detect audio activity (silence at beginning/end)
      logger.info(`[STT Worker] Detecting audio activity`);
      const audioActivity = await this.detectAudioActivity(videoPath);
      await job.updateProgress(20);

      // Step 2: Run transcription with diarization
      logger.info(`[STT Worker] Running transcription for language: ${sourceLanguage}`);
      const result: STTResult = await this.adapter.transcribe(audioPath, sourceLanguage);
      await job.updateProgress(60);

      // Step 3: Store transcript in database
      logger.info(`[STT Worker] Storing transcript in database`);
      const transcript = await this.storeTranscript(projectId, result);
      await job.updateProgress(70);

      // Step 4: Create Context Map from transcript
      logger.info(`[STT Worker] Creating Context Map`);
      const dubbingJob = await prisma.dubbingJob.findUnique({
        where: { id: projectId },
        select: { sourceLanguage: true, targetLanguage: true },
      });

      if (!dubbingJob) {
        throw new Error('Dubbing job not found');
      }

      const contextMap = await contextMapService.createFromTranscript(
        projectId,
        result.transcript,
        dubbingJob.sourceLanguage,
        dubbingJob.targetLanguage || 'en',
        audioActivity.totalDurationMs > 0 ? audioActivity : undefined
      );

      logger.info(`[STT Worker] Context Map created with ${contextMap.segments.length} segments`);
      await job.updateProgress(80);

      // Step 5: Trigger adaptation stage for translation
      logger.info(`[STT Worker] Triggering adaptation stage`);
      const userId = job.data.userId || 'system'; // Use 'system' for MVP without auth
      await this.triggerAdaptationStage(
        projectId,
        userId,
        dubbingJob.sourceLanguage,
        dubbingJob.targetLanguage || 'en'
      );
      await job.updateProgress(90);

      // Step 7: Clean up temporary audio file
      await this.cleanupTempFile(audioPath);

      // Step 8: Update job as processing (STT complete, but more stages remain)
      await this.updateJobStatus(projectId, 'PROCESSING', 30, {
        transcriptId: transcript.id,
        speakerCount: result.transcript.speakerCount,
        duration: result.transcript.duration,
        confidence: result.metadata.confidence,
        warnings: result.metadata.warnings,
        contextMapCreated: true,
        stage: 'STT_COMPLETED',
      });

      await job.updateProgress(100);

      logger.info(`[STT Worker] Job ${jobId} completed successfully`);

      return {
        success: true,
        transcriptId: transcript.id,
        metadata: result.metadata,
        contextMapCreated: true,
      };
    } catch (error: any) {
      logger.error(`[STT Worker] Job ${jobId} failed:`, error);
      await this.updateJobStatus(projectId, 'FAILED', 0, undefined, error.message);
      throw error;
    }
  }

  /**
   * Extract audio from video file using ffmpeg
   */
  private async extractAudio(videoPath: string, projectId: string): Promise<string> {
    const tempDir = os.tmpdir();
    const audioFileName = `audio-${projectId}-${Date.now()}.wav`;
    const audioPath = path.join(tempDir, audioFileName);

    try {
      await execAsync(
        `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
      );
      logger.info(`[STT Worker] Audio extracted to: ${audioPath}`);
      return audioPath;
    } catch (error: any) {
      logger.error(`[STT Worker] Failed to extract audio:`, error);
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }

  /**
   * Detect silence at the beginning and end of audio
   * Returns the start and end timestamps of actual audio activity
   */
  private async detectAudioActivity(audioPath: string): Promise<{
    audioStartMs: number;
    audioEndMs: number;
    totalDurationMs: number;
  }> {
    try {
      // Use ffmpeg silencedetect to find silence periods
      // silence_start and silence_end will tell us where silence is
      const { stderr } = await execAsync(
        `ffmpeg -i "${audioPath}" -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1`
      );

      // Get total duration
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      let totalDurationMs = 0;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        totalDurationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      }

      // Parse silence detection output
      const silenceStarts: number[] = [];
      const silenceEnds: number[] = [];

      const silenceStartMatches = stderr.matchAll(/silence_start: ([\d.]+)/g);
      for (const match of silenceStartMatches) {
        silenceStarts.push(parseFloat(match[1]) * 1000);
      }

      const silenceEndMatches = stderr.matchAll(/silence_end: ([\d.]+)/g);
      for (const match of silenceEndMatches) {
        silenceEnds.push(parseFloat(match[1]) * 1000);
      }

      // Determine audio activity start
      // Look for silence at the very beginning (first 2 seconds)
      let audioStartMs = 0;
      if (silenceEnds.length > 0) {
        const firstSilenceEnd = silenceEnds[0];
        if (firstSilenceEnd < 2000) {
          // If there's silence in the first 2 seconds, audio starts after it ends
          audioStartMs = firstSilenceEnd;
        }
      }

      // Determine audio activity end
      // Look for prolonged silence at the end (>1 second)
      let audioEndMs = totalDurationMs;
      if (silenceStarts.length > 0 && silenceEnds.length > 0) {
        // Find the last significant silence period
        for (let i = silenceStarts.length - 1; i >= 0; i--) {
          const silenceStart = silenceStarts[i];
          const silenceDuration =
            i < silenceEnds.length ? silenceEnds[i] - silenceStart : totalDurationMs - silenceStart;

          // If this silence is >1 second and in the last 25% of the video
          if (silenceDuration > 1000 && silenceStart > totalDurationMs * 0.75) {
            audioEndMs = silenceStart;
            break;
          }
        }
      }

      logger.info(
        `[STT Worker] Audio activity detected: ${audioStartMs}ms - ${audioEndMs}ms ` +
          `(total: ${totalDurationMs}ms)`
      );

      return {
        audioStartMs: Math.round(audioStartMs),
        audioEndMs: Math.round(audioEndMs),
        totalDurationMs: Math.round(totalDurationMs),
      };
    } catch (error: any) {
      logger.warn(`[STT Worker] Failed to detect audio activity:`, error);
      // Return defaults if detection fails
      return {
        audioStartMs: 0,
        audioEndMs: 0,
        totalDurationMs: 0,
      };
    }
  }

  /**
   * Store transcript in database (MVP: stored in Context Map)
   */
  private async storeTranscript(projectId: string, result: STTResult) {
    const { transcript, metadata } = result;

    // For MVP, transcript is stored in Context Map
    // Just return a simple object for compatibility
    return {
      id: projectId,
      projectId,
      content: transcript,
      confidence: metadata.confidence,
      speakerCount: transcript.speakerCount,
    };
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    progress: number,
    metadata?: any,
    errorMessage?: string
  ) {
    const updateData: any = {
      status: status.toLowerCase(),
      progress,
    };

    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completedAt = new Date();
    }

    if (errorMessage) {
      updateData.error = errorMessage;
    }

    await prisma.dubbingJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Trigger adaptation stage for translation
   */
  private async triggerAdaptationStage(
    projectId: string,
    userId: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      // Enqueue adaptation job
      const adaptationJobData = {
        projectId,
        userId,
        stage: 'ADAPTATION',
        sourceLanguage,
        targetLanguage,
      };

      await this.adaptationQueue.add(`adaptation-${projectId}`, adaptationJobData, {
        priority: 1, // High priority
      });

      logger.info(`[STT Worker] Enqueued adaptation job for project ${projectId}`);
    } catch (error: any) {
      logger.error(`[STT Worker] Failed to trigger adaptation stage:`, error);
      throw error;
    }
  }

  /**
   * Clean up temporary audio file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`[STT Worker] Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`[STT Worker] Failed to cleanup temp file:`, error);
      // Don't throw - cleanup failure shouldn't fail the job
    }
  }

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info(`[STT Worker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`[STT Worker] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      logger.error('[STT Worker] Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`[STT Worker] Job ${jobId} stalled`);
    });
  }

  /**
   * Start the worker
   */
  async start() {
    logger.info('[STT Worker] Starting STT worker...');

    // Check adapter health
    const health = await this.adapter.healthCheck();
    if (!health.healthy) {
      logger.error('[STT Worker] Adapter health check failed:', health.error);
      throw new Error('STT adapter is not healthy');
    }

    logger.info('[STT Worker] STT worker started successfully');
  }

  /**
   * Stop the worker gracefully
   */
  async stop() {
    logger.info('[STT Worker] Stopping STT worker...');
    await this.worker.close();
    await this.adaptationQueue.close();
    await prisma.$disconnect();
    logger.info('[STT Worker] STT worker stopped');
  }
}
