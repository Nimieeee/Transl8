import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getAllQueueStats,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  queueMap,
} from '../lib/queue';
import type { JobStage } from '@prisma/client';

const router = Router();

/**
 * Get statistics for all queues
 * GET /api/queue/stats
 */
router.get('/stats', authenticateToken, async (_req, res) => {
  try {
    const stats = await getAllQueueStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics',
    });
  }
});

/**
 * Get statistics for a specific queue
 * GET /api/queue/stats/:stage
 */
router.get('/stats/:stage', authenticateToken, async (req, res) => {
  try {
    const stage = req.params.stage.toUpperCase() as JobStage;
    
    if (!['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage. Must be one of: STT, MT, TTS, MUXING, LIPSYNC',
      });
    }

    const stats = await getQueueStats(stage);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics',
    });
  }
});

/**
 * Get jobs in a specific queue
 * GET /api/queue/:stage/jobs?status=waiting&limit=10
 */
router.get('/:stage/jobs', authenticateToken, async (req, res) => {
  try {
    const stage = req.params.stage.toUpperCase() as JobStage;
    const status = (req.query.status as string) || 'waiting';
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
      });
    }

    const queue = queueMap[stage as keyof typeof queueMap];
    let jobs;

    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(0, limit - 1);
        break;
      case 'active':
        jobs = await queue.getActive(0, limit - 1);
        break;
      case 'completed':
        jobs = await queue.getCompleted(0, limit - 1);
        break;
      case 'failed':
        jobs = await queue.getFailed(0, limit - 1);
        break;
      case 'delayed':
        jobs = await queue.getDelayed(0, limit - 1);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: waiting, active, completed, failed, delayed',
        });
    }

    const jobsData = jobs.map((job: any) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));

    res.json({
      success: true,
      stage,
      status,
      jobs: jobsData,
      count: jobsData.length,
    });
  } catch (error) {
    console.error('Error fetching queue jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue jobs',
    });
  }
});

/**
 * Pause a queue
 * POST /api/queue/:stage/pause
 */
router.post('/:stage/pause', authenticateToken, async (req, res) => {
  try {
    const stage = req.params.stage.toUpperCase() as JobStage;
    
    if (!['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
      });
    }

    await pauseQueue(stage);
    
    res.json({
      success: true,
      message: `Queue ${stage} paused successfully`,
    });
  } catch (error) {
    console.error('Error pausing queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
    });
  }
});

/**
 * Resume a queue
 * POST /api/queue/:stage/resume
 */
router.post('/:stage/resume', authenticateToken, async (req, res) => {
  try {
    const stage = req.params.stage.toUpperCase() as JobStage;
    
    if (!['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
      });
    }

    await resumeQueue(stage);
    
    res.json({
      success: true,
      message: `Queue ${stage} resumed successfully`,
    });
  } catch (error) {
    console.error('Error resuming queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
    });
  }
});

/**
 * Clean completed/failed jobs from a queue
 * POST /api/queue/:stage/clean
 */
router.post('/:stage/clean', authenticateToken, async (req, res) => {
  try {
    const stage = req.params.stage.toUpperCase() as JobStage;
    const grace = parseInt(req.body.grace as string) || 3600; // Default 1 hour
    
    if (!['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
      });
    }

    await cleanQueue(stage, grace);
    
    res.json({
      success: true,
      message: `Queue ${stage} cleaned successfully`,
    });
  } catch (error) {
    console.error('Error cleaning queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean queue',
    });
  }
});

/**
 * Get dead letter queue statistics
 * GET /api/queue/dead-letter/stats
 */
router.get('/dead-letter/stats', authenticateToken, async (_req, res) => {
  try {
    const { getDeadLetterQueueStats } = await import('../lib/dead-letter-queue');
    const stats = await getDeadLetterQueueStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching DLQ stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dead letter queue statistics',
    });
  }
});

/**
 * Get dead letter queue jobs for current user
 * GET /api/queue/dead-letter/jobs
 */
router.get('/dead-letter/jobs', authenticateToken, async (_req, res) => {
  try {
    const userId = _req.user!.userId;
    const { getUserDeadLetterJobs } = await import('../lib/dead-letter-queue');
    const jobs = await getUserDeadLetterJobs(userId);
    
    res.json({
      success: true,
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching DLQ jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dead letter queue jobs',
    });
  }
});

/**
 * Retry a job from dead letter queue
 * POST /api/queue/dead-letter/:jobId/retry
 */
router.post('/dead-letter/:jobId/retry', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { retryFromDeadLetterQueue } = await import('../lib/dead-letter-queue');
    
    const newJobId = await retryFromDeadLetterQueue(jobId);
    
    res.json({
      success: true,
      message: 'Job retried from dead letter queue',
      newJobId,
    });
  } catch (error) {
    console.error('Error retrying DLQ job:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry job',
    });
  }
});

export default router;
