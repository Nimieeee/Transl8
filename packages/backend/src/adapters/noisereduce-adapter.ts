/**
 * Noise Reduction Adapter
 * 
 * Adapter for noisereduce library to remove ambient noise from audio.
 * Removes hiss, ambient noise, and other stationary noise.
 * 
 * Requirements: 16.3
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../lib/logger';

export interface NoiseReductionOptions {
  propDecrease?: number; // 0.0-1.0, default 0.8
  stationary?: boolean; // default true
}

export interface NoiseReductionResult {
  cleanedPath: string;
  processingTime: number;
}

export class NoiseReduceAdapter {
  name = 'NoiseReduce';
  version = '3.0.0';
  private serviceUrl: string;

  constructor(serviceUrl?: string) {
    this.serviceUrl = serviceUrl || process.env.NOISEREDUCE_SERVICE_URL || 'http://localhost:8009';
  }

  /**
   * Remove ambient noise from audio
   * 
   * @param audioPath - Path to audio file
   * @param outputPath - Path for cleaned audio output
   * @param options - Noise reduction options
   * @returns Path to cleaned audio file
   */
  async reduceNoise(
    audioPath: string,
    outputPath: string,
    options: NoiseReductionOptions = {}
  ): Promise<NoiseReductionResult> {
    const startTime = Date.now();

    try {
      logger.info(`Reducing noise from: ${audioPath}`);

      // Verify input file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Input audio file not found: ${audioPath}`);
      }

      // Create form data with audio file and parameters
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioPath));
      formData.append('prop_decrease', (options.propDecrease || 0.8).toString());
      formData.append('stationary', (options.stationary !== false).toString());

      // Call noise reduction service
      const response = await axios.post(
        `${this.serviceUrl}/reduce`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 60000, // 1 minute timeout
        }
      );

      // Save cleaned audio to output path
      fs.writeFileSync(outputPath, response.data);

      const processingTime = Date.now() - startTime;

      logger.info(`Noise reduction completed in ${processingTime}ms: ${outputPath}`);

      return {
        cleanedPath: outputPath,
        processingTime,
      };

    } catch (error: any) {
      logger.error(`Noise reduction error: ${error.message}`);
      
      if (error.response) {
        throw new Error(
          `Noise reduction service error: ${error.response.status} - ${error.response.data}`
        );
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to noise reduction service at ${this.serviceUrl}`
        );
      } else {
        throw new Error(`Noise reduction failed: ${error.message}`);
      }
    }
  }

  /**
   * Health check for the noise reduction service
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
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
        };
      } else {
        return {
          healthy: false,
          error: 'Service reported unhealthy status',
        };
      }

    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}
