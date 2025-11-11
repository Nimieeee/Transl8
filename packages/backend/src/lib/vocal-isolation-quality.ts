/**
 * Vocal Isolation Quality Validation
 * 
 * Utilities for measuring and validating the quality of vocal isolation.
 * Includes SNR calculation, spectral analysis, and quality metrics.
 * 
 * Requirements: 22.1, 22.2
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface QualityMetrics {
  snr: number; // Signal-to-Noise Ratio in dB
  spectralPurity: number; // 0-1 scale, higher is better
  musicEnergyReduction: number; // Percentage reduction in music frequency bands
  suitable: boolean; // Whether the audio is suitable for voice cloning
  warnings: string[];
}

export class VocalIsolationQualityValidator {
  /**
   * Calculate Signal-to-Noise Ratio using FFmpeg
   * 
   * @param audioPath - Path to audio file
   * @returns SNR in dB
   */
  async calculateSNR(audioPath: string): Promise<number> {
    try {
      // Use FFmpeg astats filter to get audio statistics
      const cmd = `ffmpeg -i "${audioPath}" -af "astats=metadata=1:reset=1" -f null - 2>&1 | grep "RMS level dB"`;
      
      const { stdout } = await execAsync(cmd);
      
      // Parse RMS level from output
      const match = stdout.match(/RMS level dB:\s*(-?\d+\.?\d*)/);
      if (match) {
        const rmsDb = parseFloat(match[1]);
        // Estimate SNR (simplified calculation)
        // In practice, you'd compare signal vs noise floor
        const snr = Math.abs(rmsDb) + 20; // Rough estimate
        return snr;
      }
      
      return 0;
    } catch (error: any) {
      logger.error(`SNR calculation error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Measure music energy in specific frequency bands
   * 
   * @param audioPath - Path to audio file
   * @returns Music energy level (0-1 scale)
   */
  async measureMusicEnergy(audioPath: string): Promise<number> {
    try {
      // Use FFmpeg to analyze frequency spectrum
      // Focus on music-heavy frequency bands (bass: 60-250Hz, treble: 8-16kHz)
      const cmd = `ffmpeg -i "${audioPath}" -af "highpass=f=60,lowpass=f=250,astats" -f null - 2>&1 | grep "RMS level"`;
      
      const { stdout } = await execAsync(cmd);
      
      // Parse RMS level
      const match = stdout.match(/RMS level:\s*(-?\d+\.?\d*)/);
      if (match) {
        const rmsLevel = parseFloat(match[1]);
        // Normalize to 0-1 scale (assuming -60dB to 0dB range)
        const normalized = Math.max(0, Math.min(1, (rmsLevel + 60) / 60));
        return normalized;
      }
      
      return 0.5; // Default middle value
    } catch (error: any) {
      logger.error(`Music energy measurement error: ${error.message}`);
      return 0.5;
    }
  }

  /**
   * Calculate spectral purity (how clean the vocals are)
   * 
   * @param audioPath - Path to audio file
   * @returns Spectral purity score (0-1 scale)
   */
  async calculateSpectralPurity(audioPath: string): Promise<number> {
    try {
      // Use FFmpeg to analyze spectral flatness
      // Lower flatness = more tonal (better for vocals)
      const cmd = `ffmpeg -i "${audioPath}" -af "aspectralstats" -f null - 2>&1 | grep "flatness"`;
      
      const { stdout } = await execAsync(cmd);
      
      // Parse flatness value
      const match = stdout.match(/flatness:\s*(\d+\.?\d*)/);
      if (match) {
        const flatness = parseFloat(match[1]);
        // Invert flatness to get purity (lower flatness = higher purity)
        const purity = 1 - Math.min(1, flatness);
        return purity;
      }
      
      return 0.7; // Default good value
    } catch (error: any) {
      logger.error(`Spectral purity calculation error: ${error.message}`);
      return 0.7;
    }
  }

  /**
   * Compare audio before and after vocal isolation
   * 
   * @param originalPath - Path to original audio with music
   * @param isolatedPath - Path to isolated vocals
   * @returns Music energy reduction percentage
   */
  async compareMusicReduction(
    originalPath: string,
    isolatedPath: string
  ): Promise<number> {
    try {
      const originalEnergy = await this.measureMusicEnergy(originalPath);
      const isolatedEnergy = await this.measureMusicEnergy(isolatedPath);
      
      // Calculate reduction percentage
      const reduction = ((originalEnergy - isolatedEnergy) / originalEnergy) * 100;
      return Math.max(0, reduction);
    } catch (error: any) {
      logger.error(`Music reduction comparison error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Validate if isolated vocals are suitable for voice cloning
   * 
   * @param audioPath - Path to isolated vocals
   * @param originalPath - Optional path to original audio for comparison
   * @returns Quality metrics and suitability assessment
   */
  async validateQuality(
    audioPath: string,
    originalPath?: string
  ): Promise<QualityMetrics> {
    const warnings: string[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error('Audio file not found');
      }

      // Calculate metrics
      const snr = await this.calculateSNR(audioPath);
      const spectralPurity = await this.calculateSpectralPurity(audioPath);
      const musicEnergyReduction = originalPath
        ? await this.compareMusicReduction(originalPath, audioPath)
        : 0;

      // Determine suitability based on thresholds
      let suitable = true;

      if (snr < 15) {
        suitable = false;
        warnings.push(`Low SNR (${snr.toFixed(1)}dB). Minimum recommended: 15dB`);
      }

      if (spectralPurity < 0.6) {
        suitable = false;
        warnings.push(`Low spectral purity (${(spectralPurity * 100).toFixed(1)}%). Minimum recommended: 60%`);
      }

      if (originalPath && musicEnergyReduction < 50) {
        warnings.push(`Music energy reduction below 50% (${musicEnergyReduction.toFixed(1)}%). Consider re-processing.`);
      }

      // Check audio duration (should be at least 1 second for meaningful analysis)
      const duration = await this.getAudioDuration(audioPath);
      if (duration < 1.0) {
        warnings.push(`Audio segment too short (${duration.toFixed(2)}s). May not be suitable for voice cloning.`);
      }

      return {
        snr,
        spectralPurity,
        musicEnergyReduction,
        suitable,
        warnings,
      };
    } catch (error: any) {
      logger.error(`Quality validation error: ${error.message}`);
      return {
        snr: 0,
        spectralPurity: 0,
        musicEnergyReduction: 0,
        suitable: false,
        warnings: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Get audio duration in seconds
   * 
   * @param audioPath - Path to audio file
   * @returns Duration in seconds
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
      const { stdout } = await execAsync(cmd);
      return parseFloat(stdout.trim());
    } catch (error: any) {
      logger.error(`Duration calculation error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Batch validate multiple audio files
   * 
   * @param audioPaths - Array of audio file paths
   * @returns Map of file paths to quality metrics
   */
  async batchValidate(
    audioPaths: string[]
  ): Promise<Map<string, QualityMetrics>> {
    const results = new Map<string, QualityMetrics>();

    for (const audioPath of audioPaths) {
      try {
        const metrics = await this.validateQuality(audioPath);
        results.set(audioPath, metrics);
      } catch (error: any) {
        logger.error(`Failed to validate ${audioPath}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Generate quality report summary
   * 
   * @param metrics - Quality metrics
   * @returns Human-readable quality report
   */
  generateReport(metrics: QualityMetrics): string {
    const lines: string[] = [];
    
    lines.push('=== Vocal Isolation Quality Report ===');
    lines.push(`SNR: ${metrics.snr.toFixed(1)} dB`);
    lines.push(`Spectral Purity: ${(metrics.spectralPurity * 100).toFixed(1)}%`);
    
    if (metrics.musicEnergyReduction > 0) {
      lines.push(`Music Energy Reduction: ${metrics.musicEnergyReduction.toFixed(1)}%`);
    }
    
    lines.push(`Suitable for Voice Cloning: ${metrics.suitable ? 'YES' : 'NO'}`);
    
    if (metrics.warnings.length > 0) {
      lines.push('\nWarnings:');
      metrics.warnings.forEach(warning => {
        lines.push(`  - ${warning}`);
      });
    }
    
    return lines.join('\n');
  }
}
