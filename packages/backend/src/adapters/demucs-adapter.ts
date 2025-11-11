/**
 * Demucs Vocal Isolation Adapter
 *
 * Adapter for Demucs model to separate vocals from background music and effects.
 * Uses the Hybrid Transformer Demucs (htdemucs) model for high-quality separation.
 *
 * Requirements: 16.1, 16.2
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import {
  VocalIsolationAdapter,
  VocalIsolationResult,
  HealthCheckResult,
  AdapterMetadata,
} from './types';
import { logger } from '../lib/logger';

export class DemucsAdapter extends VocalIsolationAdapter {
  name = 'Demucs';
  version = '4.0.1';
  private serviceUrl: string;

  constructor(serviceUrl?: string) {
    super();
    this.serviceUrl = serviceUrl || process.env.DEMUCS_SERVICE_URL || 'http://localhost:8008';
  }

  /**
   * Separate vocals from background music and effects
   *
   * @param audioPath - Path to audio file with mixed content
   * @param outputPath - Path for isolated vocals output
   * @returns Path to isolated vocals file
   */
  async separateVocals(audioPath: string, outputPath: string): Promise<VocalIsolationResult> {
    const startTime = Date.now();

    try {
      logger.info(`Separating vocals from: ${audioPath}`);

      // Verify input file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Input audio file not found: ${audioPath}`);
      }

      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));

      // Call Demucs service
      const response = await axios.post(`${this.serviceUrl}/separate`, formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minute timeout
      });

      // Save vocals to output path
      fs.writeFileSync(outputPath, response.data);

      const processingTime = Date.now() - startTime;

      logger.info(`Vocal separation completed in ${processingTime}ms: ${outputPath}`);

      const metadata: AdapterMetadata = {
        processingTime,
        modelName: this.name,
        modelVersion: this.version,
      };

      return {
        vocalsPath: outputPath,
        metadata,
      };
    } catch (error: any) {
      logger.error(`Demucs vocal separation error: ${error.message}`);

      if (error.response) {
        throw new Error(`Demucs service error: ${error.response.status} - ${error.response.data}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Demucs service at ${this.serviceUrl}`);
      } else {
        throw new Error(`Vocal separation failed: ${error.message}`);
      }
    }
  }

  /**
   * Health check for the Demucs service
   *
   * @returns Health status and latency
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 5000,
      });

      const latency = Date.now() - startTime;

      if (response.data.status === 'healthy') {
        return {
          healthy: true,
          latency,
          timestamp: new Date(),
        };
      } else {
        return {
          healthy: false,
          error: 'Service reported unhealthy status',
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
