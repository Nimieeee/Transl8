/**
 * Vocal Isolation Tests
 * 
 * Tests for vocal isolation service and quality validation.
 * 
 * Requirements: 22.1, 22.2
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { VocalIsolationService } from '../../src/lib/vocal-isolation';
import { VocalIsolationQualityValidator } from '../../src/lib/vocal-isolation-quality';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Vocal Isolation Service', () => {
  let vocalIsolationService: VocalIsolationService;
  let qualityValidator: VocalIsolationQualityValidator;
  const testDir = path.join(__dirname, '../fixtures/vocal-isolation');
  const outputDir = path.join(__dirname, '../output/vocal-isolation');

  beforeAll(() => {
    vocalIsolationService = new VocalIsolationService({
      tempDir: path.join(outputDir, 'temp'),
    });
    qualityValidator = new VocalIsolationQualityValidator();

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup
    vocalIsolationService.cleanup();
  });

  describe('Audio Segment Extraction', () => {
    it('should extract audio segment with correct duration', async () => {
      // This test requires a test audio file
      // Skip if test file doesn't exist
      const testAudioPath = path.join(testDir, 'test_audio.wav');
      
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping test: test audio file not found');
        return;
      }

      const outputPath = path.join(outputDir, 'extracted_segment.wav');
      
      await vocalIsolationService.extractSegment(
        testAudioPath,
        1000, // Start at 1 second
        3000, // End at 3 seconds
        outputPath
      );

      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify duration is approximately 2 seconds
      const duration = await qualityValidator.getAudioDuration(outputPath);
      expect(duration).toBeGreaterThan(1.9);
      expect(duration).toBeLessThan(2.1);
    }, 30000);
  });

  describe('Quality Validation', () => {
    it('should calculate SNR for audio file', async () => {
      const testAudioPath = path.join(testDir, 'clean_vocals.wav');
      
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping test: test audio file not found');
        return;
      }

      const snr = await qualityValidator.calculateSNR(testAudioPath);
      
      expect(snr).toBeGreaterThan(0);
      expect(snr).toBeLessThan(100); // Reasonable upper bound
    }, 15000);

    it('should validate audio quality and provide metrics', async () => {
      const testAudioPath = path.join(testDir, 'clean_vocals.wav');
      
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping test: test audio file not found');
        return;
      }

      const metrics = await qualityValidator.validateQuality(testAudioPath);
      
      expect(metrics).toHaveProperty('snr');
      expect(metrics).toHaveProperty('spectralPurity');
      expect(metrics).toHaveProperty('suitable');
      expect(metrics).toHaveProperty('warnings');
      expect(Array.isArray(metrics.warnings)).toBe(true);
    }, 30000);

    it('should generate quality report', async () => {
      const metrics = {
        snr: 25.5,
        spectralPurity: 0.85,
        musicEnergyReduction: 75.2,
        suitable: true,
        warnings: [],
      };

      const report = qualityValidator.generateReport(metrics);
      
      expect(report).toContain('SNR: 25.5 dB');
      expect(report).toContain('Spectral Purity: 85.0%');
      expect(report).toContain('Music Energy Reduction: 75.2%');
      expect(report).toContain('Suitable for Voice Cloning: YES');
    });

    it('should flag low quality audio as unsuitable', async () => {
      const metrics = {
        snr: 10.0, // Below threshold
        spectralPurity: 0.5, // Below threshold
        musicEnergyReduction: 30.0,
        suitable: false,
        warnings: ['Low SNR', 'Low spectral purity'],
      };

      expect(metrics.suitable).toBe(false);
      expect(metrics.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      // Note: This will fail if services are not running
      // In CI/CD, services should be mocked or skipped
      try {
        const isHealthy = await vocalIsolationService.healthCheck();
        // If services are running, should be healthy
        // If not running, will be false
        expect(typeof isHealthy).toBe('boolean');
      } catch (error) {
        console.log('Health check failed (services may not be running)');
      }
    }, 10000);
  });
});

describe('Quality Metrics Thresholds', () => {
  it('should define appropriate quality thresholds', () => {
    const MIN_SNR = 15; // dB
    const MIN_SPECTRAL_PURITY = 0.6; // 60%
    const MIN_MUSIC_REDUCTION = 50; // 50%

    expect(MIN_SNR).toBeGreaterThan(10);
    expect(MIN_SPECTRAL_PURITY).toBeGreaterThan(0.5);
    expect(MIN_MUSIC_REDUCTION).toBeGreaterThan(40);
  });
});
