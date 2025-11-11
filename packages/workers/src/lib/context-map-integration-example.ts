/**
 * Context Map Integration Examples
 *
 * This file demonstrates how to integrate Context Map updates into existing workers.
 * These examples show the pattern that should be followed in each worker.
 */

import { contextMapClient } from './context-map-client';
import { logger } from './logger';

/**
 * Example: STT Worker Integration
 *
 * After transcription completes, create the Context Map from the transcript
 */
export async function sttWorkerExample(projectId: string, transcript: any) {
  try {
    // The Context Map is created by the backend service after STT completes
    // The STT worker just needs to ensure the transcript is properly formatted

    logger.info(`STT completed for project ${projectId}, Context Map will be created`);

    // The backend will call contextMapService.createFromTranscript()
    // after receiving the transcript from the STT worker
  } catch (error) {
    logger.error('STT worker Context Map integration failed:', error);
    throw error;
  }
}

/**
 * Example: Vocal Isolation Worker Integration
 *
 * After isolating vocals for each segment, update the Context Map with clean prompt paths
 */
export async function vocalIsolationWorkerExample(
  projectId: string,
  segmentId: number,
  cleanPromptPath: string
) {
  try {
    logger.info(`Adding clean prompt path for segment ${segmentId}`);

    await contextMapClient.addCleanPromptPath(projectId, segmentId, cleanPromptPath);

    logger.info(`Clean prompt path added successfully`);
  } catch (error) {
    logger.error('Vocal isolation Context Map update failed:', error);
    throw error;
  }
}

/**
 * Example: Emotion Analysis Worker Integration
 *
 * After analyzing emotion for each segment, update the Context Map with emotion tags
 */
export async function emotionAnalysisWorkerExample(
  projectId: string,
  segmentId: number,
  emotion: string
) {
  try {
    logger.info(`Adding emotion tag "${emotion}" for segment ${segmentId}`);

    await contextMapClient.addEmotionTag(
      projectId,
      segmentId,
      emotion as any // Cast to EmotionTag type
    );

    logger.info(`Emotion tag added successfully`);
  } catch (error) {
    logger.error('Emotion analysis Context Map update failed:', error);
    throw error;
  }
}

/**
 * Example: Translation/Adaptation Worker Integration
 *
 * After adapting translation for each segment, update the Context Map with results
 */
export async function adaptationWorkerExample(
  projectId: string,
  segmentId: number,
  adaptedText: string,
  success: boolean,
  attempts: number,
  validationFeedback?: string
) {
  try {
    const status = success ? 'success' : 'failed_adaptation';

    logger.info(`Adding adapted text for segment ${segmentId}, status: ${status}`);

    await contextMapClient.addAdaptedText(
      projectId,
      segmentId,
      adaptedText,
      status as any,
      attempts,
      validationFeedback
    );

    logger.info(`Adapted text added successfully`);
  } catch (error) {
    logger.error('Adaptation Context Map update failed:', error);
    throw error;
  }
}

/**
 * Example: TTS Worker Integration
 *
 * After generating audio for each segment, update the Context Map with audio paths
 */
export async function ttsWorkerExample(
  projectId: string,
  segmentId: number,
  generatedAudioPath: string
) {
  try {
    logger.info(`Adding generated audio path for segment ${segmentId}`);

    await contextMapClient.addGeneratedAudioPath(projectId, segmentId, generatedAudioPath);

    logger.info(`Generated audio path added successfully`);
  } catch (error) {
    logger.error('TTS Context Map update failed:', error);
    throw error;
  }
}

/**
 * Example: Reading Context Map for Processing
 *
 * Workers can read the Context Map to get segment information
 */
export async function readContextMapExample(projectId: string) {
  try {
    // Get the full Context Map
    const contextMap = await contextMapClient.get(projectId);

    if (!contextMap) {
      throw new Error('Context Map not found');
    }

    logger.info(`Context Map loaded with ${contextMap.segments.length} segments`);

    // Process each segment
    for (const segment of contextMap.segments) {
      logger.info(`Segment ${segment.id}:`, {
        text: segment.text,
        duration: segment.duration,
        speaker: segment.speaker,
        emotion: segment.emotion,
        status: segment.status,
        hasCleanPrompt: !!segment.clean_prompt_path,
        hasAdaptedText: !!segment.adapted_text,
        hasGeneratedAudio: !!segment.generated_audio_path,
      });

      // Example: Process only segments that have clean prompts and adapted text
      if (segment.clean_prompt_path && segment.adapted_text && segment.status === 'success') {
        // Ready for TTS generation
        logger.info(`Segment ${segment.id} is ready for TTS`);
      }
    }

    // Get summary statistics
    const summary = await contextMapClient.getSummary(projectId);
    logger.info('Context Map summary:', summary);

    return contextMap;
  } catch (error) {
    logger.error('Failed to read Context Map:', error);
    throw error;
  }
}

/**
 * Example: Validating Context Map
 *
 * Workers can validate the Context Map structure before processing
 */
export async function validateContextMapExample(projectId: string) {
  try {
    const validation = await contextMapClient.validate(projectId);

    if (!validation.valid) {
      logger.error('Context Map validation failed:', validation.errors);
      throw new Error(`Context Map validation failed: ${validation.errors.join(', ')}`);
    }

    logger.info('Context Map validation passed');
    return true;
  } catch (error) {
    logger.error('Context Map validation error:', error);
    throw error;
  }
}

/**
 * Example: Batch Processing with Context Map
 *
 * Process multiple segments in parallel while updating Context Map
 */
export async function batchProcessingExample(projectId: string) {
  try {
    const contextMap = await contextMapClient.get(projectId);

    if (!contextMap) {
      throw new Error('Context Map not found');
    }

    // Filter segments that need processing
    const segmentsToProcess = contextMap.segments.filter(
      (seg) => seg.status === 'pending' || !seg.status
    );

    logger.info(`Processing ${segmentsToProcess.length} segments in parallel`);

    // Process segments in parallel (with concurrency limit)
    const CONCURRENCY = 5;
    const results = [];

    for (let i = 0; i < segmentsToProcess.length; i += CONCURRENCY) {
      const batch = segmentsToProcess.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map(async (segment) => {
          try {
            // Example: Process segment (replace with actual processing logic)
            const result = await processSegment(segment);

            // Update Context Map with result
            await contextMapClient.updateSegment(projectId, segment.id, {
              status: 'success' as any,
              // Add other updates as needed
            });

            return { segmentId: segment.id, success: true };
          } catch (error) {
            logger.error(`Failed to process segment ${segment.id}:`, error);

            // Update Context Map with failure
            await contextMapClient.updateSegment(projectId, segment.id, {
              status: 'failed_adaptation' as any,
            });

            return { segmentId: segment.id, success: false, error };
          }
        })
      );

      results.push(...batchResults);
    }

    // Get final summary
    const summary = await contextMapClient.getSummary(projectId);
    logger.info('Batch processing complete:', summary);

    return summary;
  } catch (error) {
    logger.error('Batch processing failed:', error);
    throw error;
  }
}

// Mock function for example
async function processSegment(segment: any): Promise<any> {
  // Replace with actual processing logic
  return { processed: true };
}
