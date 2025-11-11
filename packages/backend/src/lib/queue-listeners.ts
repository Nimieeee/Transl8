import { jobManager } from './job-manager';
import { queueEventsMap, queueMap } from './queue';
import type { JobStage } from '@prisma/client';
import { moveToDeadLetterQueue } from './dead-letter-queue';

/**
 * Set up event listeners for all queues to automatically update job status
 */
export function setupQueueListeners() {
  const stages: JobStage[] = ['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'];

  stages.forEach(stage => {
    const queueEvents = queueEventsMap[stage as keyof typeof queueEventsMap];

    // Job started
    queueEvents.on('active', async ({ jobId }: { jobId: string }) => {
      try {
        await jobManager.markJobStarted(jobId);
        console.log(`[${stage}] Job ${jobId} started`);
      } catch (error) {
        console.error(`[${stage}] Error marking job ${jobId} as started:`, error);
      }
    });

    // Job progress
    queueEvents.on('progress', async ({ jobId, data }: { jobId: string; data: any }) => {
      try {
        const progress = typeof data === 'number' ? data : (data as any).progress || 0;
        await jobManager.updateJobProgress(jobId, progress);
        console.log(`[${stage}] Job ${jobId} progress: ${progress}%`);
      } catch (error) {
        console.error(`[${stage}] Error updating job ${jobId} progress:`, error);
      }
    });

    // Job completed
    queueEvents.on('completed', async ({ jobId, returnvalue }: { jobId: string; returnvalue: any }) => {
      try {
        await jobManager.markJobCompleted(jobId, returnvalue);
        console.log(`[${stage}] Job ${jobId} completed`);
      } catch (error) {
        console.error(`[${stage}] Error marking job ${jobId} as completed:`, error);
      }
    });

    // Job failed
    queueEvents.on('failed', async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      try {
        await jobManager.markJobFailed(jobId, failedReason || 'Unknown error');
        console.error(`[${stage}] Job ${jobId} failed: ${failedReason}`);
      } catch (error) {
        console.error(`[${stage}] Error marking job ${jobId} as failed:`, error);
      }
    });

    // Job stalled (worker crashed or took too long)
    queueEvents.on('stalled', async ({ jobId }: { jobId: string }) => {
      console.warn(`[${stage}] Job ${jobId} stalled - will be retried`);
    });

    // Job retrying
    queueEvents.on('retries-exhausted', async ({ jobId }: { jobId: string }) => {
      console.error(`[${stage}] Job ${jobId} exhausted all retries`);
      
      try {
        // Get the job from the queue
        const queue = queueMap[stage as keyof typeof queueMap];
        const job = await queue.getJob(jobId);
        
        if (job) {
          const jobData = job.data;
          const failedReason = job.failedReason || 'Unknown error';
          
          // Build error history from job attempts
          const errorHistory = [];
          for (let i = 1; i <= job.attemptsMade; i++) {
            errorHistory.push({
              attempt: i,
              error: failedReason,
              timestamp: new Date(job.processedOn || Date.now()),
            });
          }
          
          // Move to dead letter queue
          await moveToDeadLetterQueue(
            jobId,
            jobData.projectId,
            jobData.userId,
            stage,
            jobData,
            failedReason,
            job.attemptsMade,
            errorHistory
          );
        }
      } catch (error) {
        console.error(`[${stage}] Error moving job ${jobId} to DLQ:`, error);
      }
    });
  });

  console.log('Queue event listeners initialized');
}

/**
 * Clean up queue listeners
 */
export function cleanupQueueListeners() {
  const stages: JobStage[] = ['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'];

  stages.forEach(stage => {
    const queueEvents = queueEventsMap[stage as keyof typeof queueEventsMap];
    queueEvents.removeAllListeners();
  });

  console.log('Queue event listeners cleaned up');
}
