/**
 * Context Map Service
 * 
 * Manages the Context Map data structure that flows through the robust pipeline.
 * The Context Map contains all segment metadata including timing, emotion, clean audio paths,
 * and translation status.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { storage } from './storage';
import { ContextMap, ContextMapSegment, EmotionTag, SegmentStatus } from '@shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ContextMapService {
  /**
   * Create a new Context Map from STT transcript
   */
  async createFromTranscript(
    projectId: string,
    transcript: {
      segments: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        speaker: string;
        confidence: number;
      }>;
      duration: number;
    },
    sourceLanguage: string,
    targetLanguage: string,
    audioActivity?: {
      audioStartMs: number;
      audioEndMs: number;
      totalDurationMs: number;
    }
  ): Promise<ContextMap> {
    logger.info(`Creating Context Map for project ${projectId}`);

    // Adjust segment timestamps based on audio activity detection
    const audioStartOffset = audioActivity?.audioStartMs || 0;
    
    if (audioStartOffset > 0) {
      logger.info(`Adjusting segment timestamps by +${audioStartOffset}ms (audio activity start)`);
    }

    // Convert transcript segments to Context Map segments
    const segments: ContextMapSegment[] = transcript.segments.map((seg, index) => {
      const previousLine = index > 0 ? transcript.segments[index - 1].text : null;
      const nextLine = index < transcript.segments.length - 1 ? transcript.segments[index + 1].text : null;

      // Use word-level timestamps for more accurate timing
      // The first word's start time is when speech actually begins
      let actualStartMs = Math.round(seg.start * 1000);
      let actualEndMs = Math.round(seg.end * 1000);
      
      if (seg.words && seg.words.length > 0) {
        actualStartMs = Math.round(seg.words[0].start * 1000);
        actualEndMs = Math.round(seg.words[seg.words.length - 1].end * 1000);
        logger.info(
          `Segment ${seg.id}: Using word timestamps ` +
          `(${actualStartMs}ms - ${actualEndMs}ms) instead of segment timestamps ` +
          `(${Math.round(seg.start * 1000)}ms - ${Math.round(seg.end * 1000)}ms)`
        );
      }

      return {
        id: seg.id,
        start_ms: actualStartMs + audioStartOffset,
        end_ms: actualEndMs + audioStartOffset,
        duration: (actualEndMs - actualStartMs) / 1000,
        text: seg.text,
        speaker: seg.speaker,
        confidence: seg.confidence,
        previous_line: previousLine,
        next_line: nextLine,
        status: 'pending' as SegmentStatus,
        attempts: 0,
      };
    });

    const contextMap: ContextMap = {
      project_id: projectId,
      original_duration_ms: audioActivity?.totalDurationMs || Math.round(transcript.duration * 1000),
      source_language: sourceLanguage,
      target_language: targetLanguage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      segments,
      audio_activity: audioActivity ? {
        start_ms: audioActivity.audioStartMs,
        end_ms: audioActivity.audioEndMs,
      } : undefined,
    };

    // Store in database
    await prisma.contextMap.create({
      data: {
        projectId,
        originalDurationMs: contextMap.original_duration_ms,
        sourceLanguage,
        targetLanguage,
        content: contextMap as any,
      },
    });

    // Also save to file system for debugging
    await this.saveToFile(projectId, contextMap);

    logger.info(`Context Map created with ${segments.length} segments`);
    return contextMap;
  }

  /**
   * Get Context Map for a project
   */
  async get(projectId: string): Promise<ContextMap | null> {
    const record = await prisma.contextMap.findUnique({
      where: { projectId },
    });

    if (!record) {
      return null;
    }

    return record.content as ContextMap;
  }

  /**
   * Update a specific segment in the Context Map
   */
  async updateSegment(
    projectId: string,
    segmentId: number,
    updates: Partial<ContextMapSegment>
  ): Promise<ContextMap> {
    const contextMap = await this.get(projectId);
    if (!contextMap) {
      throw new Error(`Context Map not found for project ${projectId}`);
    }

    const segmentIndex = contextMap.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) {
      throw new Error(`Segment ${segmentId} not found in Context Map`);
    }

    // Update the segment
    contextMap.segments[segmentIndex] = {
      ...contextMap.segments[segmentIndex],
      ...updates,
    };

    contextMap.updated_at = new Date().toISOString();

    // Save to database
    await prisma.contextMap.update({
      where: { projectId },
      data: {
        content: contextMap as any,
        updatedAt: new Date(),
      },
    });

    // Save to file system
    await this.saveToFile(projectId, contextMap);

    logger.debug(`Updated segment ${segmentId} in Context Map for project ${projectId}`);
    return contextMap;
  }

  /**
   * Update multiple segments at once
   */
  async updateSegments(
    projectId: string,
    updates: Array<{ segmentId: number; data: Partial<ContextMapSegment> }>
  ): Promise<ContextMap> {
    const contextMap = await this.get(projectId);
    if (!contextMap) {
      throw new Error(`Context Map not found for project ${projectId}`);
    }

    // Apply all updates
    for (const update of updates) {
      const segmentIndex = contextMap.segments.findIndex(s => s.id === update.segmentId);
      if (segmentIndex !== -1) {
        contextMap.segments[segmentIndex] = {
          ...contextMap.segments[segmentIndex],
          ...update.data,
        };
      }
    }

    contextMap.updated_at = new Date().toISOString();

    // Save to database
    await prisma.contextMap.update({
      where: { projectId },
      data: {
        content: contextMap as any,
        updatedAt: new Date(),
      },
    });

    // Save to file system
    await this.saveToFile(projectId, contextMap);

    logger.info(`Updated ${updates.length} segments in Context Map for project ${projectId}`);
    return contextMap;
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
   * Get summary statistics from Context Map
   */
  async getSummary(projectId: string): Promise<{
    totalSegments: number;
    successfulSegments: number;
    failedSegments: number;
    pendingSegments: number;
    averageAttempts: number;
    completionRate: number;
  }> {
    const contextMap = await this.get(projectId);
    if (!contextMap) {
      throw new Error(`Context Map not found for project ${projectId}`);
    }

    const totalSegments = contextMap.segments.length;
    const successfulSegments = contextMap.segments.filter(s => s.status === 'success').length;
    const failedSegments = contextMap.segments.filter(
      s => s.status && s.status.startsWith('failed_')
    ).length;
    const pendingSegments = contextMap.segments.filter(
      s => !s.status || s.status === 'pending'
    ).length;

    const totalAttempts = contextMap.segments.reduce((sum, s) => sum + (s.attempts || 0), 0);
    const averageAttempts = totalSegments > 0 ? totalAttempts / totalSegments : 0;
    const completionRate = totalSegments > 0 ? (successfulSegments / totalSegments) * 100 : 0;

    return {
      totalSegments,
      successfulSegments,
      failedSegments,
      pendingSegments,
      averageAttempts,
      completionRate,
    };
  }

  /**
   * Validate Context Map structure
   */
  validateContextMap(contextMap: ContextMap): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!contextMap.project_id) {
      errors.push('Missing project_id');
    }

    if (!contextMap.original_duration_ms || contextMap.original_duration_ms <= 0) {
      errors.push('Invalid original_duration_ms');
    }

    if (!contextMap.segments || !Array.isArray(contextMap.segments)) {
      errors.push('Missing or invalid segments array');
    } else {
      // Validate each segment
      contextMap.segments.forEach((segment, index) => {
        if (segment.start_ms < 0) {
          errors.push(`Segment ${index}: Invalid start_ms`);
        }
        if (segment.end_ms <= segment.start_ms) {
          errors.push(`Segment ${index}: end_ms must be greater than start_ms`);
        }
        if (!segment.text) {
          errors.push(`Segment ${index}: Missing text`);
        }
        if (!segment.speaker) {
          errors.push(`Segment ${index}: Missing speaker`);
        }
      });

      // Check for overlapping segments
      for (let i = 0; i < contextMap.segments.length - 1; i++) {
        const current = contextMap.segments[i];
        const next = contextMap.segments[i + 1];
        if (current.end_ms > next.start_ms) {
          errors.push(`Segments ${i} and ${i + 1} overlap`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Save Context Map to file system for debugging
   */
  private async saveToFile(projectId: string, contextMap: ContextMap): Promise<void> {
    try {
      const contextMapDir = path.join(process.cwd(), 'temp', projectId);
      await fs.mkdir(contextMapDir, { recursive: true });

      const filePath = path.join(contextMapDir, 'context_map.json');
      await fs.writeFile(filePath, JSON.stringify(contextMap, null, 2), 'utf-8');

      logger.debug(`Context Map saved to ${filePath}`);
    } catch (error) {
      logger.error('Failed to save Context Map to file:', error);
      // Don't throw - this is just for debugging
    }
  }

  /**
   * Export Context Map as JSON for debugging
   */
  async exportToJson(projectId: string): Promise<string> {
    const contextMap = await this.get(projectId);
    if (!contextMap) {
      throw new Error(`Context Map not found for project ${projectId}`);
    }

    return JSON.stringify(contextMap, null, 2);
  }

  /**
   * Delete Context Map
   */
  async delete(projectId: string): Promise<void> {
    await prisma.contextMap.delete({
      where: { projectId },
    });

    logger.info(`Context Map deleted for project ${projectId}`);
  }
}

// Export singleton instance
export const contextMapService = new ContextMapService();
