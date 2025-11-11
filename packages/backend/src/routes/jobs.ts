import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { jobManager } from '../lib/job-manager';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Get job status by ID
 * GET /api/jobs/:jobId
 */
router.get('/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.userId;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Verify user owns this job's project
    if (job.project.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        projectId: job.projectId,
        projectName: job.project.name,
        stage: job.stage,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage,
        metadata: job.metadata,
        retryCount: job.retryCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job',
    });
  }
});

/**
 * Get all jobs for a project
 * GET /api/jobs/project/:projectId
 */
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (project.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const jobs = await jobManager.getProjectJobs(projectId);

    res.json({
      success: true,
      jobs: jobs.map((job) => ({
        id: job.id,
        stage: job.stage,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage,
        retryCount: job.retryCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching project jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project jobs',
    });
  }
});

/**
 * Get current active job for a project
 * GET /api/jobs/project/:projectId/current
 */
router.get('/project/:projectId/current', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (project.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const job = await jobManager.getCurrentJob(projectId);

    if (!job) {
      return res.json({
        success: true,
        job: null,
        message: 'No active job found',
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        stage: job.stage,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching current job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current job',
    });
  }
});

/**
 * Retry a failed job
 * POST /api/jobs/:jobId/retry
 */
router.post('/:jobId/retry', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.userId;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Verify user owns this job's project
    if (job.project.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (job.status !== 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'Only failed jobs can be retried',
      });
    }

    const newJobId = await jobManager.retryJob(jobId);

    res.json({
      success: true,
      message: 'Job retry initiated',
      newJobId,
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry job',
    });
  }
});

/**
 * Update job progress (internal use by workers)
 * PUT /api/jobs/:jobId/progress
 */
router.put('/:jobId/progress', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { progress, metadata } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        error: 'Progress must be a number between 0 and 100',
      });
    }

    await jobManager.updateJobProgress(jobId, progress, metadata);

    res.json({
      success: true,
      message: 'Job progress updated',
    });
  } catch (error) {
    console.error('Error updating job progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job progress',
    });
  }
});

export default router;
