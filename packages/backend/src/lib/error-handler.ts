import { Job as BullJob } from 'bullmq';
import { JobStage } from '@prisma/client';
import { prisma } from './prisma';
import { wsManager } from './websocket';

/**
 * Error types for job processing
 */
export enum JobErrorType {
  TRANSIENT = 'TRANSIENT', // Temporary errors that can be retried
  PERMANENT = 'PERMANENT', // Permanent errors that should not be retried
  VALIDATION = 'VALIDATION', // Input validation errors
  RESOURCE = 'RESOURCE', // Resource unavailable (GPU, storage, etc.)
  TIMEOUT = 'TIMEOUT', // Job timeout
}

/**
 * Custom error class for job processing
 */
export class JobProcessingError extends Error {
  constructor(
    message: string,
    public type: JobErrorType,
    public retryable: boolean = true,
    public metadata?: any
  ) {
    super(message);
    this.name = 'JobProcessingError';
  }
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof JobProcessingError) {
    return error.retryable;
  }

  // Check for common transient error patterns
  const transientPatterns = [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /network/i,
    /timeout/i,
    /temporarily unavailable/i,
    /service unavailable/i,
    /too many requests/i,
    /rate limit/i,
  ];

  return transientPatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attemptsMade: number): number {
  // Exponential backoff: 5s, 15s, 45s, 135s, etc.
  const baseDelay = 5000; // 5 seconds
  const maxDelay = 300000; // 5 minutes

  const delay = baseDelay * Math.pow(3, attemptsMade - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Handle job failure with retry logic
 */
export async function handleJobFailure(job: BullJob, error: Error, stage: JobStage): Promise<void> {
  const jobId = job.id as string;
  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts || 3;

  console.error(`[${stage}] Job ${jobId} failed (attempt ${attemptsMade}/${maxAttempts}):`, error);

  // Determine if error is retryable
  const retryable = isRetryableError(error);

  // Get project and user info
  const jobData = job.data;
  const projectId = jobData.projectId;
  const userId = jobData.userId;

  // Update job record with error details
  await prisma.job.update({
    where: { id: jobId },
    data: {
      errorMessage: error.message,
      metadata: {
        ...jobData,
        error: {
          message: error.message,
          type: error instanceof JobProcessingError ? error.type : 'UNKNOWN',
          retryable,
          attemptsMade,
          maxAttempts,
        },
      },
    },
  });

  // If this was the last attempt, send notification
  if (attemptsMade >= maxAttempts) {
    await notifyJobFailure(projectId, userId, stage, error, attemptsMade);
  } else if (retryable) {
    // Send retry notification
    wsManager.sendToUser(userId, {
      type: 'job_retrying',
      projectId,
      jobId,
      stage,
      attempt: attemptsMade,
      maxAttempts,
      nextRetryIn: calculateBackoffDelay(attemptsMade),
    });
  }
}

/**
 * Notify user of job failure
 */
async function notifyJobFailure(
  projectId: string,
  userId: string,
  stage: JobStage,
  error: Error,
  attemptsMade: number
): Promise<void> {
  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'FAILED' },
  });

  // Send WebSocket notification
  wsManager.sendToUser(userId, {
    type: 'job_failed_permanently',
    projectId,
    stage,
    error: error.message,
    attemptsMade,
    message: `Job failed after ${attemptsMade} attempts. Please check the error and try again.`,
  });

  // Log to database for analytics
  await prisma.job.updateMany({
    where: {
      projectId,
      stage,
      status: 'FAILED',
    },
    data: {
      metadata: {
        finalError: error.message,
        exhaustedRetries: true,
      },
    },
  });
}

/**
 * Create error response for API
 */
export function createErrorResponse(error: Error) {
  if (error instanceof JobProcessingError) {
    return {
      error: {
        code: error.type,
        message: error.message,
        retryable: error.retryable,
        details: error.metadata,
      },
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: isRetryableError(error),
    },
  };
}

/**
 * Validate job data before processing
 */
export function validateJobData(jobData: any, stage: JobStage): void {
  if (!jobData.projectId) {
    throw new JobProcessingError('Missing projectId in job data', JobErrorType.VALIDATION, false);
  }

  if (!jobData.userId) {
    throw new JobProcessingError('Missing userId in job data', JobErrorType.VALIDATION, false);
  }

  // Stage-specific validation
  switch (stage) {
    case 'STT':
      if (!jobData.audioUrl) {
        throw new JobProcessingError(
          'Missing audioUrl for STT job',
          JobErrorType.VALIDATION,
          false
        );
      }
      if (!jobData.sourceLanguage) {
        throw new JobProcessingError(
          'Missing sourceLanguage for STT job',
          JobErrorType.VALIDATION,
          false
        );
      }
      break;

    case 'MT':
      if (!jobData.transcriptId) {
        throw new JobProcessingError(
          'Missing transcriptId for MT job',
          JobErrorType.VALIDATION,
          false
        );
      }
      if (!jobData.targetLanguage) {
        throw new JobProcessingError(
          'Missing targetLanguage for MT job',
          JobErrorType.VALIDATION,
          false
        );
      }
      break;

    case 'TTS':
      if (!jobData.translationId) {
        throw new JobProcessingError(
          'Missing translationId for TTS job',
          JobErrorType.VALIDATION,
          false
        );
      }
      if (!jobData.voiceConfig) {
        throw new JobProcessingError(
          'Missing voiceConfig for TTS job',
          JobErrorType.VALIDATION,
          false
        );
      }
      break;

    case 'MUXING':
      if (!jobData.videoUrl || !jobData.audioUrl) {
        throw new JobProcessingError(
          'Missing videoUrl or audioUrl for muxing job',
          JobErrorType.VALIDATION,
          false
        );
      }
      break;

    case 'LIPSYNC':
      if (!jobData.videoUrl || !jobData.audioUrl) {
        throw new JobProcessingError(
          'Missing videoUrl or audioUrl for lip-sync job',
          JobErrorType.VALIDATION,
          false
        );
      }
      break;
  }
}
