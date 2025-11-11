import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis';
import type { JobStage } from '@prisma/client';
import { wsManager } from './websocket';

/**
 * Dead Letter Queue for permanently failed jobs
 */
export const deadLetterQueue = new Queue('dead-letter', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: {
      count: 1000, // Keep last 1000 for analysis
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: false, // Never remove failed DLQ jobs
  },
});

export const deadLetterQueueEvents = new QueueEvents('dead-letter', {
  connection: redis,
});

/**
 * Failed job data structure
 */
export interface DeadLetterJobData {
  originalJobId: string;
  projectId: string;
  userId: string;
  stage: JobStage;
  originalData: any;
  failureReason: string;
  attemptsMade: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  errorHistory: Array<{
    attempt: number;
    error: string;
    timestamp: Date;
  }>;
}

/**
 * Move a failed job to the dead letter queue
 */
export async function moveToDeadLetterQueue(
  jobId: string,
  projectId: string,
  userId: string,
  stage: JobStage,
  originalData: any,
  failureReason: string,
  attemptsMade: number,
  errorHistory: Array<{ attempt: number; error: string; timestamp: Date }>
): Promise<void> {
  const dlqData: DeadLetterJobData = {
    originalJobId: jobId,
    projectId,
    userId,
    stage,
    originalData,
    failureReason,
    attemptsMade,
    firstFailedAt: errorHistory[0]?.timestamp || new Date(),
    lastFailedAt: new Date(),
    errorHistory,
  };

  await deadLetterQueue.add(`dlq-${stage}-${jobId}`, dlqData);

  console.log(`[DLQ] Moved job ${jobId} (${stage}) to dead letter queue`);

  // Notify user
  wsManager.sendToUser(userId, {
    type: 'job_moved_to_dlq',
    projectId,
    jobId,
    stage,
    message: 'Job has been moved to dead letter queue after exhausting all retries',
  });
}

/**
 * Get all dead letter queue jobs
 */
export async function getDeadLetterJobs(
  limit: number = 100,
  offset: number = 0
): Promise<DeadLetterJobData[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'failed'], offset, offset + limit - 1);
  return jobs.map((job) => job.data as DeadLetterJobData);
}

/**
 * Get dead letter queue jobs for a specific user
 */
export async function getUserDeadLetterJobs(userId: string): Promise<DeadLetterJobData[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'failed']);
  return jobs.map((job) => job.data as DeadLetterJobData).filter((data) => data.userId === userId);
}

/**
 * Get dead letter queue jobs for a specific project
 */
export async function getProjectDeadLetterJobs(projectId: string): Promise<DeadLetterJobData[]> {
  const jobs = await deadLetterQueue.getJobs(['completed', 'failed']);
  return jobs
    .map((job) => job.data as DeadLetterJobData)
    .filter((data) => data.projectId === projectId);
}

/**
 * Retry a job from the dead letter queue
 */
export async function retryFromDeadLetterQueue(dlqJobId: string): Promise<string> {
  const job = await deadLetterQueue.getJob(dlqJobId);

  if (!job) {
    throw new Error('Dead letter queue job not found');
  }

  const dlqData = job.data as DeadLetterJobData;

  // Import jobManager to avoid circular dependency
  const { jobManager } = await import('./job-manager');

  // Create a new job with the original data
  const newJobId = await jobManager.createJob(
    dlqData.projectId,
    dlqData.stage,
    dlqData.originalData
  );

  // Remove from DLQ
  await job.remove();

  console.log(`[DLQ] Retrying job ${dlqData.originalJobId} as new job ${newJobId}`);

  return newJobId;
}

/**
 * Get dead letter queue statistics
 */
export async function getDeadLetterQueueStats() {
  const [completed, failed, waiting] = await Promise.all([
    deadLetterQueue.getCompletedCount(),
    deadLetterQueue.getFailedCount(),
    deadLetterQueue.getWaitingCount(),
  ]);

  // Get jobs by stage
  const jobs = await deadLetterQueue.getJobs(['completed', 'failed']);
  const byStage = jobs.reduce(
    (acc, job) => {
      const data = job.data as DeadLetterJobData;
      acc[data.stage] = (acc[data.stage] || 0) + 1;
      return acc;
    },
    {} as Record<JobStage, number>
  );

  return {
    total: completed + failed + waiting,
    completed,
    failed,
    waiting,
    byStage,
  };
}

/**
 * Clean old dead letter queue jobs
 */
export async function cleanDeadLetterQueue(olderThanDays: number = 7): Promise<number> {
  const grace = olderThanDays * 24 * 3600 * 1000; // Convert to milliseconds
  const cleaned = await deadLetterQueue.clean(grace, 1000, 'completed');

  console.log(`[DLQ] Cleaned ${cleaned.length} old jobs`);

  return cleaned.length;
}

/**
 * Set up dead letter queue event listeners
 */
export function setupDeadLetterQueueListeners() {
  deadLetterQueueEvents.on('added', ({ jobId }) => {
    console.log(`[DLQ] Job ${jobId} added to dead letter queue`);
  });

  deadLetterQueueEvents.on('removed', ({ jobId }) => {
    console.log(`[DLQ] Job ${jobId} removed from dead letter queue`);
  });

  console.log('Dead letter queue listeners initialized');
}

/**
 * Close dead letter queue
 */
export async function closeDeadLetterQueue(): Promise<void> {
  await deadLetterQueue.close();
  await deadLetterQueueEvents.close();
}
