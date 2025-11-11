import { prisma } from './prisma';
import { wsManager } from './websocket';
import {
  queueMap,
  JobData,
  STTJobData,
  MTJobData,
  TTSJobData,
  MuxingJobData,
  LipSyncJobData,
} from './queue';
import type { JobStage } from '@prisma/client';

/**
 * JobManager - Orchestrates job creation, tracking, and stage transitions
 */
export class JobManager {
  /**
   * Create a new job in the database and enqueue it
   */
  async createJob(
    projectId: string,
    stage: JobStage,
    jobData: JobData
  ): Promise<string> {
    // Create job record in database
    const job = await prisma.job.create({
      data: {
        projectId,
        stage,
        status: 'PENDING',
        progress: 0,
        metadata: jobData as any,
      },
    });

    // Enqueue the job in the appropriate queue
    const queue = queueMap[stage as keyof typeof queueMap];
    await queue.add(
      `${stage.toLowerCase()}-${projectId}`,
      jobData as any,
      {
        jobId: job.id,
      }
    );

    // Send WebSocket notification
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (project) {
      wsManager.sendToUser(project.userId, {
        type: 'job_created',
        projectId,
        jobId: job.id,
        stage,
        status: 'PENDING',
      });
    }

    return job.id;
  }

  /**
   * Start the STT stage for a project
   */
  async startSTTStage(
    projectId: string,
    userId: string,
    audioUrl: string,
    sourceLanguage: string
  ): Promise<string> {
    const jobData: STTJobData = {
      projectId,
      userId,
      stage: 'STT',
      audioUrl,
      sourceLanguage,
    };

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PROCESSING' },
    });

    return this.createJob(projectId, 'STT', jobData);
  }

  /**
   * Start the MT stage for a project
   */
  async startMTStage(
    projectId: string,
    userId: string,
    transcriptId: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossaryEnabled: boolean = false
  ): Promise<string> {
    const jobData: MTJobData = {
      projectId,
      userId,
      stage: 'MT',
      transcriptId,
      sourceLanguage,
      targetLanguage,
      glossaryEnabled,
    };

    return this.createJob(projectId, 'MT', jobData);
  }

  /**
   * Start the TTS stage for a project
   */
  async startTTSStage(
    projectId: string,
    userId: string,
    translationId: string,
    voiceConfig: any,
    targetLanguage: string
  ): Promise<string> {
    const jobData: TTSJobData = {
      projectId,
      userId,
      stage: 'TTS',
      translationId,
      voiceConfig,
      targetLanguage,
    };

    return this.createJob(projectId, 'TTS', jobData);
  }

  /**
   * Start the muxing stage for a project
   */
  async startMuxingStage(
    projectId: string,
    userId: string,
    videoUrl: string,
    audioUrl: string,
    applyWatermark: boolean
  ): Promise<string> {
    const jobData: MuxingJobData = {
      projectId,
      userId,
      stage: 'MUXING',
      videoUrl,
      audioUrl,
      applyWatermark,
    };

    return this.createJob(projectId, 'MUXING', jobData);
  }

  /**
   * Start the lip-sync stage for a project
   */
  async startLipSyncStage(
    projectId: string,
    userId: string,
    videoUrl: string,
    audioUrl: string
  ): Promise<string> {
    const jobData: LipSyncJobData = {
      projectId,
      userId,
      stage: 'LIPSYNC',
      videoUrl,
      audioUrl,
    };

    return this.createJob(projectId, 'LIPSYNC', jobData);
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    progress: number,
    metadata?: any
  ): Promise<void> {
    const updateData: any = {
      progress,
      updatedAt: new Date(),
    };

    if (metadata) {
      updateData.metadata = metadata;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    // Send WebSocket notification
    wsManager.sendToUser(job.project.userId, {
      type: 'job_progress',
      projectId: job.projectId,
      jobId: job.id,
      stage: job.stage,
      progress: job.progress,
    });
  }

  /**
   * Mark job as started
   */
  async markJobStarted(jobId: string): Promise<void> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    // Send WebSocket notification
    wsManager.sendToUser(job.project.userId, {
      type: 'job_started',
      projectId: job.projectId,
      jobId: job.id,
      stage: job.stage,
    });
  }

  /**
   * Mark job as completed and trigger next stage
   */
  async markJobCompleted(
    jobId: string,
    outputData?: any
  ): Promise<void> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        metadata: outputData,
      },
      include: {
        project: {
          select: { 
            userId: true,
            status: true,
            targetLanguage: true,
            voiceConfig: true,
            videoUrl: true,
          },
        },
      },
    });

    // Send WebSocket notification
    wsManager.sendToUser(job.project.userId, {
      type: 'job_completed',
      projectId: job.projectId,
      jobId: job.id,
      stage: job.stage,
    });

    // Trigger next stage based on current stage
    await this.triggerNextStage(job.projectId, job.stage, job.project.userId);
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    // Update project status to failed
    await prisma.project.update({
      where: { id: job.projectId },
      data: { status: 'FAILED' },
    });

    // Send WebSocket notification
    wsManager.sendToUser(job.project.userId, {
      type: 'job_failed',
      projectId: job.projectId,
      jobId: job.id,
      stage: job.stage,
      error: errorMessage,
    });
  }

  /**
   * Trigger the next stage in the pipeline
   */
  private async triggerNextStage(
    projectId: string,
    completedStage: JobStage,
    userId: string
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        transcripts: true,
        translations: true,
        user: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    switch (completedStage) {
      case 'STT':
        // After STT, update project status to REVIEW for user to review transcript
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'REVIEW' },
        });

        wsManager.sendToUser(userId, {
          type: 'stage_ready_for_review',
          projectId,
          stage: 'STT',
          message: 'Transcript is ready for review',
        });
        break;

      case 'MT':
        // After MT, update project status to REVIEW for user to review translation
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'REVIEW' },
        });

        wsManager.sendToUser(userId, {
          type: 'stage_ready_for_review',
          projectId,
          stage: 'MT',
          message: 'Translation is ready for review',
        });
        break;

      case 'TTS':
        // After TTS, automatically start muxing
        const ttsJob = await prisma.job.findFirst({
          where: {
            projectId,
            stage: 'TTS',
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
        });

        if (ttsJob?.metadata && project.videoUrl) {
          const audioUrl = (ttsJob.metadata as any).audioUrl;
          const applyWatermark = project.user.subscriptionTier === 'FREE';

          await this.startMuxingStage(
            projectId,
            userId,
            project.videoUrl,
            audioUrl,
            applyWatermark
          );
        }
        break;

      case 'MUXING':
        // After muxing, check if lip-sync is enabled (premium feature)
        const shouldApplyLipSync = 
          project.user.subscriptionTier === 'PRO' || 
          project.user.subscriptionTier === 'ENTERPRISE';

        if (shouldApplyLipSync) {
          const muxingJob = await prisma.job.findFirst({
            where: {
              projectId,
              stage: 'MUXING',
              status: 'COMPLETED',
            },
            orderBy: { completedAt: 'desc' },
          });

          if (muxingJob?.metadata) {
            const videoUrl = (muxingJob.metadata as any).videoUrl;
            const audioUrl = (muxingJob.metadata as any).audioUrl;

            await this.startLipSyncStage(projectId, userId, videoUrl, audioUrl);
          }
        } else {
          // Mark project as completed
          await prisma.project.update({
            where: { id: projectId },
            data: { status: 'COMPLETED' },
          });

          wsManager.sendToUser(userId, {
            type: 'project_completed',
            projectId,
            message: 'Video dubbing completed successfully',
          });
        }
        break;

      case 'LIPSYNC':
        // Mark project as completed
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'COMPLETED' },
        });

        wsManager.sendToUser(userId, {
          type: 'project_completed',
          projectId,
          message: 'Video dubbing with lip-sync completed successfully',
        });
        break;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * Get all jobs for a project
   */
  async getProjectJobs(projectId: string) {
    return prisma.job.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get current active job for a project
   */
  async getCurrentJob(projectId: string) {
    return prisma.job.findFirst({
      where: {
        projectId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<string> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'FAILED') {
      throw new Error('Only failed jobs can be retried');
    }

    // Increment retry count
    await prisma.job.update({
      where: { id: jobId },
      data: {
        retryCount: job.retryCount + 1,
      },
    });

    // Create a new job with the same data
    const jobData = job.metadata as any as JobData;
    return this.createJob(job.projectId, job.stage, jobData);
  }
}

// Export singleton instance
export const jobManager = new JobManager();
