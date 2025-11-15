/**
 * Muxing Worker
 *
 * Combines synchronized audio with original video using FFmpeg.
 * Integrates with the absolute synchronization assembly system.
 */

import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { videoProcessor } from '../../backend/src/lib/video-processor';
import { contextMapClient } from './lib/context-map-client';
import { logger } from './lib/logger';

const prisma = new PrismaClient();

interface MuxingJobData {
  projectId: string;
  userId: string;
  videoPath: string;
  finalAudioPath: string;
  applyWatermark?: boolean;
  subscriptionTier?: string;
}

export class MuxingWorker {
  /**
   * Process muxing job
   */
  async process(job: Job<MuxingJobData>): Promise<void> {
    const { projectId, videoPath, finalAudioPath, applyWatermark, subscriptionTier } =
      job.data;

    try {
      logger.info(`Starting video muxing for project ${projectId}`);

      // Update job progress
      await job.updateProgress(10);

      // Step 1: Verify input files exist
      logger.info('Verifying input files');

      try {
        await fs.access(videoPath);
        logger.info(`Video file verified: ${videoPath}`);
      } catch (error) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      try {
        await fs.access(finalAudioPath);
        logger.info(`Audio file verified: ${finalAudioPath}`);
      } catch (error) {
        throw new Error(`Audio file not found: ${finalAudioPath}`);
      }

      await job.updateProgress(20);

      // Step 2: Get Context Map for metadata
      logger.info('Fetching Context Map for metadata');
      const contextMap = await contextMapClient.get(projectId);

      if (!contextMap) {
        logger.warn('Context Map not found, proceeding without metadata');
      }

      await job.updateProgress(30);

      // Step 3: Prepare output path
      const outputDir = path.join('temp', projectId);
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const outputFilename = `dubbed_video_${timestamp}.mp4`;
      const outputPath = path.join(outputDir, outputFilename);

      logger.info(`Output path: ${outputPath}`);

      await job.updateProgress(40);

      // Step 4: Determine if watermark should be applied
      const shouldApplyWatermark =
        applyWatermark !== false && (subscriptionTier === 'free' || !subscriptionTier);

      if (shouldApplyWatermark) {
        logger.info('Applying watermark for free tier');
      } else {
        logger.info('No watermark (premium tier)');
      }

      await job.updateProgress(50);

      // Step 5: Mux audio and video
      logger.info('Muxing audio and video with FFmpeg');

      await videoProcessor.muxAudioVideo(videoPath, finalAudioPath, outputPath, {
        applyWatermark: shouldApplyWatermark,
        watermarkText: 'Preview - Upgrade to remove watermark',
      });

      await job.updateProgress(80);

      // Step 6: Verify output file
      logger.info('Verifying output file');

      try {
        await fs.access(outputPath);
        const stats = await fs.stat(outputPath);
        logger.info(`Output file created: ${outputPath} (${stats.size} bytes)`);
      } catch (error) {
        throw new Error(`Output file not created: ${outputPath}`);
      }

      await job.updateProgress(90);

      // Step 7: Validate audio-video synchronization
      logger.info('Validating audio-video synchronization');

      const metadata = await videoProcessor.getVideoMetadata(outputPath);

      if (contextMap) {
        const expectedDurationMs = contextMap.original_duration_ms;
        const actualDurationMs = metadata.duration * 1000;
        const differenceMs = Math.abs(actualDurationMs - expectedDurationMs);

        logger.info(
          `Duration validation: expected ${expectedDurationMs}ms, ` +
            `got ${actualDurationMs}ms (difference: ${differenceMs}ms)`
        );

        if (differenceMs > 100) {
          logger.warn(`Duration mismatch exceeds tolerance: ${differenceMs}ms > 100ms`);
        } else {
          logger.info('Audio-video synchronization validated successfully');
        }
      }

      await job.updateProgress(95);

      // Step 8: Store result in job data and database
      // Note: outputPath stored in database, not in job data type
      logger.info(`Output path for database: ${outputPath}`);

      // Update database with output file path
      await prisma.dubbingJob.update({
        where: { id: projectId },
        data: {
          outputFile: outputPath,
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
      });

      await job.updateProgress(100);

      logger.info(`Video muxing completed for project ${projectId}`);
      logger.info(`Final video: ${outputPath}`);
    } catch (error) {
      logger.error(`Video muxing failed for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Verify audio-video synchronization in final output
   */
  async verifySynchronization(
    videoPath: string,
    expectedDurationMs: number,
    toleranceMs: number = 100
  ): Promise<boolean> {
    try {
      const metadata = await videoProcessor.getVideoMetadata(videoPath);
      const actualDurationMs = metadata.duration * 1000;
      const differenceMs = Math.abs(actualDurationMs - expectedDurationMs);

      const isValid = differenceMs <= toleranceMs;

      if (!isValid) {
        logger.error(
          `Synchronization validation failed: ` +
            `expected ${expectedDurationMs}ms, got ${actualDurationMs}ms ` +
            `(difference: ${differenceMs}ms, tolerance: ${toleranceMs}ms)`
        );
      } else {
        logger.info(
          `Synchronization validated: ${actualDurationMs}ms ` + `(difference: ${differenceMs}ms)`
        );
      }

      return isValid;
    } catch (error) {
      logger.error('Synchronization verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const muxingWorker = new MuxingWorker();
