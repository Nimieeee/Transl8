/**
 * Audio Quality Monitoring Service
 *
 * Measures and tracks audio quality metrics including vocal isolation quality,
 * noise reduction effectiveness, and TTS output quality.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AudioQualityMetrics {
  projectId: string;
  segmentId: number;
  vocalIsolationSnr?: number;
  spectralPurity?: number;
  noiseReductionSnr?: number;
  noiseReductionDb?: number;
  ttsQualityScore?: number;
  ttsConfidence?: number;
}

export interface AudioQualityDashboard {
  overallMetrics: {
    averageVocalIsolationSnr: number;
    averageSpectralPurity: number;
    averageNoiseReductionDb: number;
    averageTtsQuality: number;
  };
  byProject: Array<{
    projectId: string;
    segmentCount: number;
    averageVocalSnr: number;
    averageNoiseReduction: number;
    averageTtsQuality: number;
  }>;
  qualityAlerts: Array<{
    projectId: string;
    segmentId: number;
    metric: string;
    value: number;
    threshold: number;
    message: string;
  }>;
  trendsOverTime: Array<{
    date: string;
    avgVocalSnr: number;
    avgNoiseReduction: number;
    avgTtsQuality: number;
  }>;
}

export class AudioQualityMonitor {
  // Quality thresholds
  private readonly VOCAL_SNR_THRESHOLD = 10; // dB
  private readonly SPECTRAL_PURITY_THRESHOLD = 0.7; // 0-1 scale
  private readonly NOISE_REDUCTION_THRESHOLD = 5; // dB improvement
  private readonly TTS_QUALITY_THRESHOLD = 0.7; // 0-1 scale

  /**
   * Record audio quality metrics for a segment
   */
  async recordMetrics(metrics: AudioQualityMetrics): Promise<void> {
    await prisma.audioQualityMetrics.create({
      data: {
        projectId: metrics.projectId,
        segmentId: metrics.segmentId,
        vocalIsolationSnr: metrics.vocalIsolationSnr,
        spectralPurity: metrics.spectralPurity,
        noiseReductionSnr: metrics.noiseReductionSnr,
        noiseReductionDb: metrics.noiseReductionDb,
        ttsQualityScore: metrics.ttsQualityScore,
        ttsConfidence: metrics.ttsConfidence,
      },
    });

    // Check for quality degradation and alert
    await this.checkQualityAlerts(metrics);

    logger.debug(
      `Recorded audio quality metrics for project ${metrics.projectId}, segment ${metrics.segmentId}`
    );
  }

  /**
   * Calculate SNR (Signal-to-Noise Ratio) from audio data
   * This is a simplified calculation - in production, use more sophisticated methods
   */
  calculateSnr(signalRms: number, noiseRms: number): number {
    if (noiseRms === 0) return Infinity;
    return 20 * Math.log10(signalRms / noiseRms);
  }

  /**
   * Calculate spectral purity (how much music/noise remains after isolation)
   * Returns a value between 0 (very impure) and 1 (very pure)
   */
  calculateSpectralPurity(vocalSpectrum: number[], originalSpectrum: number[]): number {
    // Simplified calculation - compare energy in music frequency bands
    // In production, use more sophisticated spectral analysis

    if (vocalSpectrum.length !== originalSpectrum.length) {
      throw new Error('Spectrum arrays must have same length');
    }

    // Calculate energy ratio in non-vocal frequency bands
    const musicBands = [0, 100, 8000, 20000]; // Hz ranges where music dominates
    let vocalEnergy = 0;
    let originalEnergy = 0;

    for (let i = 0; i < vocalSpectrum.length; i++) {
      vocalEnergy += vocalSpectrum[i];
      originalEnergy += originalSpectrum[i];
    }

    if (originalEnergy === 0) return 1;

    // Purity is inverse of energy ratio
    const energyRatio = vocalEnergy / originalEnergy;
    return Math.max(0, Math.min(1, 1 - energyRatio * 0.5));
  }

  /**
   * Measure noise reduction effectiveness
   */
  measureNoiseReduction(
    noisyAudioRms: number,
    cleanAudioRms: number,
    noiseFloorBefore: number,
    noiseFloorAfter: number
  ): { snrImprovement: number; dbReduction: number } {
    const snrBefore = this.calculateSnr(noisyAudioRms, noiseFloorBefore);
    const snrAfter = this.calculateSnr(cleanAudioRms, noiseFloorAfter);

    const snrImprovement = snrAfter - snrBefore;
    const dbReduction = 20 * Math.log10(noiseFloorBefore / noiseFloorAfter);

    return {
      snrImprovement,
      dbReduction,
    };
  }

  /**
   * Assess TTS output quality
   * This is a placeholder - in production, use MOS prediction models
   */
  assessTtsQuality(
    audioPath: string,
    expectedDuration: number,
    emotion?: string
  ): Promise<{ qualityScore: number; confidence: number }> {
    // Placeholder implementation
    // In production, use:
    // - MOS prediction models (e.g., NISQA, DNSMOS)
    // - Prosody analysis
    // - Emotion preservation verification

    return Promise.resolve({
      qualityScore: 0.85, // Placeholder
      confidence: 0.9, // Placeholder
    });
  }

  /**
   * Check for quality degradation and generate alerts
   */
  private async checkQualityAlerts(metrics: AudioQualityMetrics): Promise<void> {
    const alerts: string[] = [];

    if (
      metrics.vocalIsolationSnr !== undefined &&
      metrics.vocalIsolationSnr < this.VOCAL_SNR_THRESHOLD
    ) {
      alerts.push(
        `Low vocal isolation SNR: ${metrics.vocalIsolationSnr.toFixed(2)} dB (threshold: ${this.VOCAL_SNR_THRESHOLD} dB)`
      );
    }

    if (
      metrics.spectralPurity !== undefined &&
      metrics.spectralPurity < this.SPECTRAL_PURITY_THRESHOLD
    ) {
      alerts.push(
        `Low spectral purity: ${metrics.spectralPurity.toFixed(2)} (threshold: ${this.SPECTRAL_PURITY_THRESHOLD})`
      );
    }

    if (
      metrics.noiseReductionDb !== undefined &&
      metrics.noiseReductionDb < this.NOISE_REDUCTION_THRESHOLD
    ) {
      alerts.push(
        `Insufficient noise reduction: ${metrics.noiseReductionDb.toFixed(2)} dB (threshold: ${this.NOISE_REDUCTION_THRESHOLD} dB)`
      );
    }

    if (
      metrics.ttsQualityScore !== undefined &&
      metrics.ttsQualityScore < this.TTS_QUALITY_THRESHOLD
    ) {
      alerts.push(
        `Low TTS quality score: ${metrics.ttsQualityScore.toFixed(2)} (threshold: ${this.TTS_QUALITY_THRESHOLD})`
      );
    }

    if (alerts.length > 0) {
      logger.warn(
        `Audio quality alerts for project ${metrics.projectId}, segment ${metrics.segmentId}:`,
        alerts
      );
      // In production, send to monitoring system (DataDog, Sentry, etc.)
    }
  }

  /**
   * Get dashboard data with comprehensive audio quality metrics
   */
  async getDashboard(days: number = 30): Promise<AudioQualityDashboard> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allMetrics = await prisma.audioQualityMetrics.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall metrics
    const validVocalSnr = allMetrics.filter((m) => m.vocalIsolationSnr !== null);
    const validSpectralPurity = allMetrics.filter((m) => m.spectralPurity !== null);
    const validNoiseReduction = allMetrics.filter((m) => m.noiseReductionDb !== null);
    const validTtsQuality = allMetrics.filter((m) => m.ttsQualityScore !== null);

    const averageVocalIsolationSnr =
      validVocalSnr.length > 0
        ? validVocalSnr.reduce((sum, m) => sum + (m.vocalIsolationSnr || 0), 0) /
          validVocalSnr.length
        : 0;

    const averageSpectralPurity =
      validSpectralPurity.length > 0
        ? validSpectralPurity.reduce((sum, m) => sum + (m.spectralPurity || 0), 0) /
          validSpectralPurity.length
        : 0;

    const averageNoiseReductionDb =
      validNoiseReduction.length > 0
        ? validNoiseReduction.reduce((sum, m) => sum + (m.noiseReductionDb || 0), 0) /
          validNoiseReduction.length
        : 0;

    const averageTtsQuality =
      validTtsQuality.length > 0
        ? validTtsQuality.reduce((sum, m) => sum + (m.ttsQualityScore || 0), 0) /
          validTtsQuality.length
        : 0;

    // Group by project
    const byProjectMap = new Map<
      string,
      {
        segmentCount: number;
        totalVocalSnr: number;
        totalNoiseReduction: number;
        totalTtsQuality: number;
        vocalSnrCount: number;
        noiseReductionCount: number;
        ttsQualityCount: number;
      }
    >();

    allMetrics.forEach((metric) => {
      const existing = byProjectMap.get(metric.projectId);
      if (existing) {
        existing.segmentCount++;
        if (metric.vocalIsolationSnr !== null) {
          existing.totalVocalSnr += metric.vocalIsolationSnr;
          existing.vocalSnrCount++;
        }
        if (metric.noiseReductionDb !== null) {
          existing.totalNoiseReduction += metric.noiseReductionDb;
          existing.noiseReductionCount++;
        }
        if (metric.ttsQualityScore !== null) {
          existing.totalTtsQuality += metric.ttsQualityScore;
          existing.ttsQualityCount++;
        }
      } else {
        byProjectMap.set(metric.projectId, {
          segmentCount: 1,
          totalVocalSnr: metric.vocalIsolationSnr || 0,
          totalNoiseReduction: metric.noiseReductionDb || 0,
          totalTtsQuality: metric.ttsQualityScore || 0,
          vocalSnrCount: metric.vocalIsolationSnr !== null ? 1 : 0,
          noiseReductionCount: metric.noiseReductionDb !== null ? 1 : 0,
          ttsQualityCount: metric.ttsQualityScore !== null ? 1 : 0,
        });
      }
    });

    const byProject = Array.from(byProjectMap.entries()).map(([projectId, data]) => ({
      projectId,
      segmentCount: data.segmentCount,
      averageVocalSnr: data.vocalSnrCount > 0 ? data.totalVocalSnr / data.vocalSnrCount : 0,
      averageNoiseReduction:
        data.noiseReductionCount > 0 ? data.totalNoiseReduction / data.noiseReductionCount : 0,
      averageTtsQuality: data.ttsQualityCount > 0 ? data.totalTtsQuality / data.ttsQualityCount : 0,
    }));

    // Generate quality alerts
    const qualityAlerts: AudioQualityDashboard['qualityAlerts'] = [];
    allMetrics.forEach((metric) => {
      if (
        metric.vocalIsolationSnr !== null &&
        metric.vocalIsolationSnr < this.VOCAL_SNR_THRESHOLD
      ) {
        qualityAlerts.push({
          projectId: metric.projectId,
          segmentId: metric.segmentId,
          metric: 'Vocal Isolation SNR',
          value: metric.vocalIsolationSnr,
          threshold: this.VOCAL_SNR_THRESHOLD,
          message: `Low vocal isolation quality`,
        });
      }

      if (
        metric.noiseReductionDb !== null &&
        metric.noiseReductionDb < this.NOISE_REDUCTION_THRESHOLD
      ) {
        qualityAlerts.push({
          projectId: metric.projectId,
          segmentId: metric.segmentId,
          metric: 'Noise Reduction',
          value: metric.noiseReductionDb,
          threshold: this.NOISE_REDUCTION_THRESHOLD,
          message: `Insufficient noise reduction`,
        });
      }

      if (metric.ttsQualityScore !== null && metric.ttsQualityScore < this.TTS_QUALITY_THRESHOLD) {
        qualityAlerts.push({
          projectId: metric.projectId,
          segmentId: metric.segmentId,
          metric: 'TTS Quality',
          value: metric.ttsQualityScore,
          threshold: this.TTS_QUALITY_THRESHOLD,
          message: `Low TTS output quality`,
        });
      }
    });

    // Sort alerts by severity (lowest values first)
    qualityAlerts.sort((a, b) => a.value - b.value);

    // Calculate trends over time
    const trendsMap = new Map<
      string,
      {
        vocalSnrSum: number;
        vocalSnrCount: number;
        noiseReductionSum: number;
        noiseReductionCount: number;
        ttsQualitySum: number;
        ttsQualityCount: number;
      }
    >();

    allMetrics.forEach((metric) => {
      const dateKey = metric.createdAt.toISOString().split('T')[0];
      const existing = trendsMap.get(dateKey);

      if (existing) {
        if (metric.vocalIsolationSnr !== null) {
          existing.vocalSnrSum += metric.vocalIsolationSnr;
          existing.vocalSnrCount++;
        }
        if (metric.noiseReductionDb !== null) {
          existing.noiseReductionSum += metric.noiseReductionDb;
          existing.noiseReductionCount++;
        }
        if (metric.ttsQualityScore !== null) {
          existing.ttsQualitySum += metric.ttsQualityScore;
          existing.ttsQualityCount++;
        }
      } else {
        trendsMap.set(dateKey, {
          vocalSnrSum: metric.vocalIsolationSnr || 0,
          vocalSnrCount: metric.vocalIsolationSnr !== null ? 1 : 0,
          noiseReductionSum: metric.noiseReductionDb || 0,
          noiseReductionCount: metric.noiseReductionDb !== null ? 1 : 0,
          ttsQualitySum: metric.ttsQualityScore || 0,
          ttsQualityCount: metric.ttsQualityScore !== null ? 1 : 0,
        });
      }
    });

    const trendsOverTime = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        avgVocalSnr: data.vocalSnrCount > 0 ? data.vocalSnrSum / data.vocalSnrCount : 0,
        avgNoiseReduction:
          data.noiseReductionCount > 0 ? data.noiseReductionSum / data.noiseReductionCount : 0,
        avgTtsQuality: data.ttsQualityCount > 0 ? data.ttsQualitySum / data.ttsQualityCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      overallMetrics: {
        averageVocalIsolationSnr,
        averageSpectralPurity,
        averageNoiseReductionDb,
        averageTtsQuality,
      },
      byProject,
      qualityAlerts: qualityAlerts.slice(0, 50), // Limit to 50 most severe
      trendsOverTime,
    };
  }

  /**
   * Get metrics for a specific project
   */
  async getProjectMetrics(projectId: string): Promise<AudioQualityMetrics[]> {
    const metrics = await prisma.audioQualityMetrics.findMany({
      where: { projectId },
      orderBy: { segmentId: 'asc' },
    });

    return metrics.map((m) => ({
      projectId: m.projectId,
      segmentId: m.segmentId,
      vocalIsolationSnr: m.vocalIsolationSnr || undefined,
      spectralPurity: m.spectralPurity || undefined,
      noiseReductionSnr: m.noiseReductionSnr || undefined,
      noiseReductionDb: m.noiseReductionDb || undefined,
      ttsQualityScore: m.ttsQualityScore || undefined,
      ttsConfidence: m.ttsConfidence || undefined,
    }));
  }
}

// Export singleton instance
export const audioQualityMonitor = new AudioQualityMonitor();
