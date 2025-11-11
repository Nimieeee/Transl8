# Job Queue System Documentation

## Overview

The job queue system is built with BullMQ and Redis to handle asynchronous processing of video dubbing pipeline stages. It provides:

- **Separate queues** for each pipeline stage (STT, MT, TTS, Muxing, Lip-Sync)
- **Automatic stage progression** after job completion
- **Exponential backoff retry** for transient failures
- **Dead letter queue** for permanently failed jobs
- **Real-time progress updates** via WebSocket
- **Queue monitoring dashboard** via REST API

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ STT Queue   │────▶│  MT Queue   │────▶│ TTS Queue   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Muxing Queue│
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │Lip-Sync Queue│
                                        │  (Premium)   │
                                        └─────────────┘
```

## Components

### 1. Queue Infrastructure (`lib/queue.ts`)

Defines and configures all BullMQ queues:

```typescript
import { sttQueue, mtQueue, ttsQueue, muxingQueue, lipSyncQueue } from './lib/queue';

// Get queue statistics
const stats = await getAllQueueStats();

// Pause/resume a queue
await pauseQueue('STT');
await resumeQueue('STT');
```

### 2. Job Manager (`lib/job-manager.ts`)

Orchestrates job creation and stage transitions:

```typescript
import { jobManager } from './lib/job-manager';

// Start STT stage
const jobId = await jobManager.startSTTStage(
  projectId,
  userId,
  audioUrl,
  sourceLanguage
);

// Update job progress
await jobManager.updateJobProgress(jobId, 50);

// Mark job as completed (automatically triggers next stage)
await jobManager.markJobCompleted(jobId, outputData);

// Retry a failed job
await jobManager.retryJob(jobId);
```

### 3. Error Handling (`lib/error-handler.ts`)

Provides error classification and retry logic:

```typescript
import { JobProcessingError, JobErrorType } from './lib/error-handler';

// Throw a retryable error
throw new JobProcessingError(
  'GPU temporarily unavailable',
  JobErrorType.RESOURCE,
  true // retryable
);

// Throw a permanent error
throw new JobProcessingError(
  'Invalid audio format',
  JobErrorType.VALIDATION,
  false // not retryable
);
```

### 4. Dead Letter Queue (`lib/dead-letter-queue.ts`)

Handles permanently failed jobs:

```typescript
import { 
  getDeadLetterQueueStats,
  getUserDeadLetterJobs,
  retryFromDeadLetterQueue 
} from './lib/dead-letter-queue';

// Get DLQ statistics
const stats = await getDeadLetterQueueStats();

// Get failed jobs for a user
const jobs = await getUserDeadLetterJobs(userId);

// Retry a job from DLQ
const newJobId = await retryFromDeadLetterQueue(dlqJobId);
```

## API Endpoints

### Queue Monitoring

```bash
# Get all queue statistics
GET /api/queue/stats

# Get specific queue statistics
GET /api/queue/stats/STT

# Get jobs in a queue
GET /api/queue/STT/jobs?status=waiting&limit=10

# Pause a queue
POST /api/queue/STT/pause

# Resume a queue
POST /api/queue/STT/resume

# Clean old jobs
POST /api/queue/STT/clean
```

### Job Management

```bash
# Get job status
GET /api/jobs/:jobId

# Get all jobs for a project
GET /api/jobs/project/:projectId

# Get current active job
GET /api/jobs/project/:projectId/current

# Retry a failed job
POST /api/jobs/:jobId/retry

# Update job progress (internal use by workers)
PUT /api/jobs/:jobId/progress
```

### Dead Letter Queue

```bash
# Get DLQ statistics
GET /api/queue/dead-letter/stats

# Get user's failed jobs
GET /api/queue/dead-letter/jobs

# Retry job from DLQ
POST /api/queue/dead-letter/:jobId/retry
```

## Job Lifecycle

1. **Job Creation**: JobManager creates a database record and enqueues the job
2. **Job Started**: Worker picks up the job, status changes to PROCESSING
3. **Progress Updates**: Worker sends progress updates (0-100%)
4. **Job Completed**: Worker marks job as complete, triggers next stage
5. **Stage Transition**: JobManager automatically enqueues the next stage
6. **Human Review**: Some stages (STT, MT) require user approval before proceeding

## Retry Logic

Jobs are automatically retried with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: After 5 seconds
- **Attempt 3**: After 15 seconds
- **Attempt 4**: After 45 seconds (if max attempts > 3)

After exhausting all retries, jobs are moved to the dead letter queue.

## WebSocket Events

Real-time updates are sent to users via WebSocket:

```typescript
// Job created
{
  type: 'job_created',
  projectId: string,
  jobId: string,
  stage: string,
  status: 'PENDING'
}

// Job started
{
  type: 'job_started',
  projectId: string,
  jobId: string,
  stage: string
}

// Job progress
{
  type: 'job_progress',
  projectId: string,
  jobId: string,
  stage: string,
  progress: number
}

// Job completed
{
  type: 'job_completed',
  projectId: string,
  jobId: string,
  stage: string
}

// Job failed
{
  type: 'job_failed',
  projectId: string,
  jobId: string,
  stage: string,
  error: string
}

// Stage ready for review
{
  type: 'stage_ready_for_review',
  projectId: string,
  stage: string,
  message: string
}

// Project completed
{
  type: 'project_completed',
  projectId: string,
  message: string
}
```

## Worker Implementation

Workers should follow this pattern:

```typescript
import { Worker } from 'bullmq';
import { redis } from './lib/redis';
import { STTJobData } from './lib/queue';

const sttWorker = new Worker<STTJobData>(
  'stt',
  async (job) => {
    const { projectId, audioUrl, sourceLanguage } = job.data;
    
    try {
      // Update progress
      await job.updateProgress(10);
      
      // Process the job
      const result = await processSTT(audioUrl, sourceLanguage);
      
      await job.updateProgress(90);
      
      // Return result (will be stored in job metadata)
      return {
        transcriptId: result.id,
        confidence: result.confidence,
      };
    } catch (error) {
      // Error will be caught and handled by error handler
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 jobs concurrently
  }
);

sttWorker.on('completed', (job) => {
  console.log(`STT job ${job.id} completed`);
});

sttWorker.on('failed', (job, err) => {
  console.error(`STT job ${job?.id} failed:`, err);
});
```

## Configuration

Queue configuration is in `lib/queue.ts`:

```typescript
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
};
```

## Monitoring

The system provides comprehensive monitoring:

1. **Queue Statistics**: Job counts by status (waiting, active, completed, failed)
2. **Job History**: Complete history of all jobs for a project
3. **Error Tracking**: Failed jobs with error messages and retry counts
4. **Dead Letter Queue**: Permanently failed jobs for manual review
5. **Real-time Updates**: WebSocket notifications for all job events

## Best Practices

1. **Always validate job data** before processing
2. **Send progress updates** regularly (every 10-20% progress)
3. **Use appropriate error types** (TRANSIENT vs PERMANENT)
4. **Clean up resources** after job completion
5. **Monitor queue depths** to detect bottlenecks
6. **Set appropriate concurrency** based on available resources
7. **Test retry logic** with transient failures
8. **Review dead letter queue** regularly for patterns

## Troubleshooting

### Jobs stuck in waiting state
- Check if workers are running
- Check Redis connection
- Check queue is not paused

### Jobs failing repeatedly
- Check error messages in job records
- Review dead letter queue for patterns
- Verify resource availability (GPU, storage, etc.)

### High queue depth
- Increase worker concurrency
- Scale up worker instances
- Optimize job processing time

### Memory issues
- Reduce job retention settings
- Clean old jobs more frequently
- Reduce worker concurrency
