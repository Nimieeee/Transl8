/**
 * Vocal Isolation Service
 * 
 * Service for extracting and isolating vocal segments from audio files.
 * Combines audio slicing with Demucs vocal separation and noise reduction.
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { DemucsAdapter } from '../adapters/demucs-adapter';
import { NoiseReduceAdapter } from '../adapters/noisereduce-adapter';
import { logger } from './logger';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AudioSegmentInfo {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker: string;
}

export interface VocalIsolationOptions {
  tempDir?: string;
  keepIntermediateFiles?: boolean;
}

export class VocalIsolationService {
  private demucsAdapter: DemucsAdapter;
  private noiseReduceAdapter: NoiseReduceAdapter;
  private tempDir: string;

  constructor(options: VocalIsolationOptions = {}) {
    this.demucsAdapter = new DemucsAdapter();
    this.noiseReduceAdapter = new NoiseReduceAdapter();
    this.tempDir = options.tempDir || '/tmp/vocal-isolation';
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract audio segment from full audio file
   * 
   * @param audioPath - Path to full audio file
   * @param startMs - Start time in milliseconds
   * @param endMs - End time in milliseconds
   * @param outputPath - Path for extracted segment
   * @returns Path to extracted segment
   */
  async extractSegment(
    audioPath: string,
    startMs: number,
    endMs: number,
    outputPath: string
  ): Promise<string> {
    try {
      const startSec = startMs / 1000;
      const duration = (endMs - startMs) / 1000;

      // Use FFmpeg to extract segment
      const cmd = `ffmpeg -i "${audioPath}" -ss ${startSec} -t ${duration} -acodec pcm_s16le -ar 16000 "${outputPath}" -y`;
      
      await execAsync(cmd);

      if (!fs.existsSync(outputPath)) {
        throw new Error('Failed to extract audio segment');
      }

      return outputPath;

    } catch (error: any) {
      logger.error(`Audio segment extraction error: ${error.message}`);
      throw new Error(`Failed to extract audio segment: ${error.message}`);
    }
  }

  /**
   * Isolate vocals from a single audio segment (Demucs only, no noise reduction)
   * 
   * @param segmentPath - Path to audio segment
   * @param outputPath - Path for clean vocals
   * @returns Path to clean vocals
   */
  async isolateSegmentVocals(
    segmentPath: string,
    outputPath: string
  ): Promise<string> {
    try {
      // Separate vocals from music/effects using Demucs only
      const demucsResult = await this.demucsAdapter.separateVocals(segmentPath, outputPath);
      
      logger.info(`Vocals separated: ${demucsResult.vocalsPath}`);

      // Return the Demucs output directly (no noise reduction)
      return demucsResult.vocalsPath;

    } catch (error: any) {
      logger.error(`Vocal isolation error: ${error.message}`);
      throw new Error(`Failed to isolate vocals: ${error.message}`);
    }
  }

  /**
   * Process a segment: extract from full audio and isolate vocals
   * 
   * @param audioPath - Path to full audio file
   * @param segment - Segment information
   * @param outputDir - Directory for output files
   * @returns Path to clean vocal segment
   */
  async processSegment(
    audioPath: string,
    segment: AudioSegmentInfo,
    outputDir: string
  ): Promise<string> {
    const segmentId = segment.id.toString().padStart(4, '0');
    
    try {
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Step 1: Extract segment
      const segmentPath = path.join(this.tempDir, `segment_${segmentId}_raw.wav`);
      await this.extractSegment(audioPath, segment.startMs, segment.endMs, segmentPath);
      
      logger.info(`Extracted segment ${segmentId}: ${segment.startMs}ms - ${segment.endMs}ms`);

      // Step 2: Isolate vocals
      const vocalsPath = path.join(outputDir, `clean_prompt_${segmentId}.wav`);
      await this.isolateSegmentVocals(segmentPath, vocalsPath);
      
      logger.info(`Isolated vocals for segment ${segmentId}: ${vocalsPath}`);

      // Clean up temporary segment file
      if (fs.existsSync(segmentPath)) {
        fs.unlinkSync(segmentPath);
      }

      return vocalsPath;

    } catch (error: any) {
      logger.error(`Segment processing error for segment ${segmentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple segments in batch
   * 
   * @param audioPath - Path to full audio file
   * @param segments - Array of segment information
   * @param outputDir - Directory for output files
   * @returns Map of segment IDs to clean vocal paths
   */
  async processSegments(
    audioPath: string,
    segments: AudioSegmentInfo[],
    outputDir: string
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    logger.info(`Processing ${segments.length} segments for vocal isolation`);

    for (const segment of segments) {
      try {
        const cleanPath = await this.processSegment(audioPath, segment, outputDir);
        results.set(segment.id, cleanPath);
      } catch (error: any) {
        logger.error(`Failed to process segment ${segment.id}: ${error.message}`);
        // Continue with other segments even if one fails
      }
    }

    logger.info(`Completed vocal isolation for ${results.size}/${segments.length} segments`);

    return results;
  }

  /**
   * Health check for vocal isolation service
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      const demucsHealth = await this.demucsAdapter.healthCheck();
      const noiseReduceHealth = await this.noiseReduceAdapter.healthCheck();
      return demucsHealth.healthy && noiseReduceHealth.healthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
    } catch (error: any) {
      logger.error(`Cleanup error: ${error.message}`);
    }
  }
}
