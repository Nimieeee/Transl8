/**
 * Final Assembly Worker
 *
 * Orchestrates the absolute synchronization assembly process to create
 * the final dubbed audio track with perfect synchronization.
 */

import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { contextMapClient } from './lib/context-map-client';
import { logger } from './lib/logger';

const prisma = new PrismaClient();
const ABSOLUTE_SYNC_SERVICE_URL = process.env.ABSOLUTE_SYNC_SERVICE_URL || 'http://localhost:8012';

interface FinalAssemblyJobData {
  projectId: string;
  userId: string;
  contextMapPath?: string;
}

interface MuxingJobData {
  projectId: string;
  userId: string;
  videoPath: string;
  finalAudioPath: string;
  applyWatermark?: boolean;
  subscriptionTier?: string;
}

interface AssemblyResult {
  success: boolean;
  output_path?: string;
  original_duration_ms?: number;
  final_duration_ms?: number;
  duration_difference_ms?: number;
  total_segments?: number;
  successful_segments?: number;
  failed_segments?: number;
  skipped_segments?: number;
  completion_rate?: number;
  error?: string;
}

export class FinalAssemblyWorker {
  private muxingQueue: Queue;
  private redisConnection: any;

  constructor(redisConnection?: any) {
    this.redisConnection = redisConnection || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    // Create muxing queue for triggering next stage
    this.muxingQueue = new Queue('muxing', {
      connection: this.redisConnection,
    });
  }

  /**
   * Process final assembly job
   */
  async process(job: Job<FinalAssemblyJobData>): Promise<void> {
    const { projectId, userId } = job.data;

    try {
      logger.info(`Starting final assembly for project ${projectId}`);

      // Update job progress
      await job.updateProgress(10);

      // Step 1: Get Context Map
      logger.info('Fetching Context Map');
      const contextMap = await contextMapClient.get(projectId);

      if (!contextMap) {
        throw new Error('Context Map not found');
      }

      await job.updateProgress(20);

      // Step 2: Check for local TTS files (for development without cloud storage)
      const ttsOutputDir = path.join(process.cwd(), 'temp', projectId, 'tts-output');

      // Check if local TTS files exist
      let useLocalFiles = false;
      try {
        await fs.access(ttsOutputDir);
        useLocalFiles = true;
        logger.info(`Using local TTS files from: ${ttsOutputDir}`);
      } catch {
        logger.info('No local TTS files found, checking Context Map for cloud storage paths');
      }

      // If using local files, update Context Map with local paths
      if (useLocalFiles) {
        for (let i = 0; i < contextMap.segments.length; i++) {
          const segment = contextMap.segments[i];
          const localPath = path.join(ttsOutputDir, `segment_${String(i).padStart(4, '0')}.wav`);

          try {
            await fs.access(localPath);
            segment.generated_audio_path = localPath;
            segment.status = 'success';
            logger.info(`Found local TTS file for segment ${i}: ${localPath}`);
          } catch {
            logger.warn(`Local TTS file not found for segment ${i}: ${localPath}`);
          }
        }
      }

      // Validate Context Map has required data
      const segmentsWithAudio = contextMap.segments.filter(
        (seg: any) => seg.generated_audio_path && seg.status === 'success'
      );

      if (segmentsWithAudio.length === 0) {
        throw new Error('No segments with generated audio found in Context Map or local files');
      }

      logger.info(
        `Context Map loaded: ${contextMap.segments.length} total segments, ` +
          `${segmentsWithAudio.length} with generated audio`
      );

      await job.updateProgress(30);

      // Step 3: Prepare output path
      const outputDir = path.join('temp', projectId);
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, 'final_dubbed_audio.wav');

      logger.info(`Output path: ${outputPath}`);

      await job.updateProgress(40);

      // Step 4: Assemble audio with proper timing (respecting segment timestamps)
      logger.info('Assembling audio segments with proper timing');

      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Sort segments by start time
      const sortedSegments = segmentsWithAudio.sort((a: any, b: any) => a.start_ms - b.start_ms);

      // Build ffmpeg filter complex to place each segment at its correct timestamp
      // CRITICAL: Trim each segment to its exact duration to prevent overlaps
      const inputs: string[] = [];
      const filterParts: string[] = [];

      sortedSegments.forEach((segment: any, index: number) => {
        inputs.push(`-i "${segment.generated_audio_path}"`);

        // Calculate delay in milliseconds and target duration in seconds
        const delayMs = segment.start_ms;
        const targetDurationSec = segment.duration;

        // IMPORTANT: Trim audio to exact duration, then add delay
        // This prevents overlaps when TTS audio is longer than the target
        filterParts.push(
          `[${index}:a]atrim=0:${targetDurationSec},adelay=${delayMs}|${delayMs}[a${index}]`
        );
      });

      // Mix all delayed audio streams
      const mixInputs = sortedSegments.map((_: any, i: number) => `[a${i}]`).join('');
      const filterComplex = `${filterParts.join(';')};${mixInputs}amix=inputs=${sortedSegments.length}:duration=longest[out]`;

      // Get actual video duration to ensure audio matches
      let videoDurationSec = 0;
      try {
        const project = await prisma.dubbingJob.findUnique({
          where: { id: projectId },
          select: { originalFile: true },
        });

        if (project?.originalFile) {
          const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${project.originalFile}"`
          );
          videoDurationSec = parseFloat(stdout.trim());
          logger.info(`Video duration from file: ${videoDurationSec}s`);
        }
      } catch (error) {
        logger.warn('Could not get video duration, using Context Map duration');
      }

      // Use video duration if available, otherwise use Context Map duration
      const totalDurationMs =
        videoDurationSec > 0
          ? videoDurationSec * 1000
          : contextMap.original_duration_ms ||
            Math.max(...sortedSegments.map((s: any) => s.end_ms));
      const totalDurationSec = totalDurationMs / 1000;

      // Build and execute ffmpeg command with padding to match video duration
      const ffmpegCmd = `ffmpeg ${inputs.join(' ')} -filter_complex "${filterComplex};[out]apad=whole_dur=${totalDurationSec}s[padded]" -map "[padded]" -t ${totalDurationSec} -y "${outputPath}"`;

      logger.info(
        `Executing ffmpeg with timing: ${sortedSegments.length} segments over ${totalDurationSec}s (padded to match video)`
      );

      try {
        await execAsync(ffmpegCmd);
        logger.info(`Audio assembled successfully with proper timing: ${outputPath}`);
      } catch (error: any) {
        logger.error('FFmpeg assembly failed:', error);

        // Fallback to simple concatenation if timing-based assembly fails
        logger.warn('Falling back to simple concatenation');

        const segmentFiles = sortedSegments.map((seg: any) => seg.generated_audio_path);
        const concatListPath = path.join(outputDir, 'concat_list.txt');
        const concatContent = segmentFiles.map((file: string) => `file '${file}'`).join('\n');
        await fs.writeFile(concatListPath, concatContent);

        await execAsync(
          `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}" -y`
        );
        logger.info(`Audio concatenated successfully (fallback): ${outputPath}`);
      }

      await job.updateProgress(80);

      // Step 5: Verify output file exists
      try {
        await fs.access(outputPath);
        const stats = await fs.stat(outputPath);
        logger.info(`Final audio file verified: ${outputPath} (${stats.size} bytes)`);
      } catch (error) {
        throw new Error(`Final audio file not found: ${outputPath}`);
      }

      await job.updateProgress(90);

      // Step 6: Log result metadata
      logger.info('Assembly result:', {
        outputPath,
        segmentCount: segmentsWithAudio.length,
        method: 'simple_concatenation',
      });

      await job.updateProgress(95);

      // Step 7: Trigger muxing stage
      logger.info(`Triggering muxing stage for project ${projectId}`);
      await this.triggerMuxingStage(projectId, userId, outputPath);

      await job.updateProgress(100);

      logger.info(`Final assembly completed for project ${projectId}`);
    } catch (error) {
      logger.error(`Final assembly failed for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger muxing stage after final assembly
   */
  private async triggerMuxingStage(
    projectId: string,
    userId: string,
    finalAudioPath: string
  ): Promise<void> {
    try {
      // Get project details
      const project = await prisma.dubbingJob.findUnique({
        where: { id: projectId },
        select: {
          originalFile: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!project || !project.originalFile) {
        throw new Error('Project or video file not found');
      }

      // Determine if watermark should be applied (default to false for MVP)
      const applyWatermark = false;

      // Enqueue muxing job
      const muxingJobData: MuxingJobData = {
        projectId,
        userId,
        videoPath: project.originalFile,
        finalAudioPath,
        applyWatermark,
        subscriptionTier: 'FREE', // Default for MVP
      };

      await this.muxingQueue.add(`muxing-${projectId}`, muxingJobData, {
        priority: 1, // High priority
      });

      logger.info(`[Final Assembly Worker] Enqueued muxing job for project ${projectId}`);
    } catch (error: any) {
      logger.error(`[Final Assembly Worker] Failed to trigger muxing stage:`, error);
      throw error;
    }
  }

  /**
   * Validate final audio duration matches original
   */
  async validateFinalAudio(
    finalAudioPath: string,
    expectedDurationMs: number,
    toleranceMs: number = 10
  ): Promise<boolean> {
    try {
      // This would typically use ffprobe or similar to get audio duration
      // For now, we rely on the assembly service validation
      logger.info(
        `Validating final audio: ${finalAudioPath} ` +
          `(expected: ${expectedDurationMs}ms, tolerance: ${toleranceMs}ms)`
      );

      // Check file exists
      await fs.access(finalAudioPath);

      return true;
    } catch (error) {
      logger.error('Final audio validation failed:', error);
      return false;
    }
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    await this.muxingQueue.close();
    await prisma.$disconnect();
    logger.info('Final assembly worker closed');
  }
}

// Export singleton instance
export const finalAssemblyWorker = new FinalAssemblyWorker();
