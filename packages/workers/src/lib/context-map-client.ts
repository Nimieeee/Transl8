/**
 * Context Map Client for Workers
 *
 * Provides utilities for workers to interact with the Context Map service
 */

import axios from 'axios';
import { ContextMap, ContextMapSegment, EmotionTag, SegmentStatus } from '@shared/types';
import { logger } from './logger';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

export class ContextMapClient {
  /**
   * Get Context Map for a project
   */
  async get(projectId: string): Promise<ContextMap | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects/${projectId}/context-map`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn(`Context Map not found for project ${projectId}`);
        return null;
      }
      logger.error('Failed to get Context Map:', error);
      throw error;
    }
  }

  /**
   * Update a specific segment
   */
  async updateSegment(
    projectId: string,
    segmentId: number,
    updates: Partial<ContextMapSegment>
  ): Promise<ContextMap> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/projects/${projectId}/context-map/segments/${segmentId}`,
        updates
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to update segment ${segmentId}:`, error);
      throw error;
    }
  }

  /**
   * Add clean prompt path to a segment (after vocal isolation)
   */
  async addCleanPromptPath(
    projectId: string,
    segmentId: number,
    cleanPromptPath: string
  ): Promise<ContextMap> {
    return this.updateSegment(projectId, segmentId, {
      clean_prompt_path: cleanPromptPath,
    });
  }

  /**
   * Add emotion tag to a segment (after emotion analysis)
   */
  async addEmotionTag(
    projectId: string,
    segmentId: number,
    emotion: EmotionTag
  ): Promise<ContextMap> {
    return this.updateSegment(projectId, segmentId, {
      emotion,
    });
  }

  /**
   * Add adapted text and status to a segment (after translation)
   */
  async addAdaptedText(
    projectId: string,
    segmentId: number,
    adaptedText: string,
    status: SegmentStatus,
    attempts: number,
    validationFeedback?: string
  ): Promise<ContextMap> {
    return this.updateSegment(projectId, segmentId, {
      adapted_text: adaptedText,
      status,
      attempts,
      validation_feedback: validationFeedback,
    });
  }

  /**
   * Add generated audio path to a segment (after TTS)
   */
  async addGeneratedAudioPath(
    projectId: string,
    segmentId: number,
    generatedAudioPath: string
  ): Promise<ContextMap> {
    return this.updateSegment(projectId, segmentId, {
      generated_audio_path: generatedAudioPath,
    });
  }

  /**
   * Get summary statistics
   */
  async getSummary(projectId: string): Promise<{
    totalSegments: number;
    successfulSegments: number;
    failedSegments: number;
    pendingSegments: number;
    averageAttempts: number;
    completionRate: number;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${projectId}/context-map/summary`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get Context Map summary:', error);
      throw error;
    }
  }

  /**
   * Validate Context Map structure
   */
  async validate(projectId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${projectId}/context-map/validate`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to validate Context Map:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const contextMapClient = new ContextMapClient();
