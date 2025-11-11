import express, { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import {
  generateStorageKey,
  uploadFile,
  generateSignedUrl,
  deleteFile,
} from '../lib/storage';
import { validateVideo, extractAudio } from '../lib/video-validator';
import { wsManager } from '../lib/websocket';
import {
  calculateQualityMetrics,
  flagSegmentsForReview,
  meetsMinimumQuality,
} from '../lib/transcript-quality';
import type { Transcript } from '../adapters/types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

/**
 * GET /api/projects/supported-languages - Get list of supported languages
 */
router.get('/supported-languages', (_req: Request, res: Response) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    languageNames: {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
    },
  });
});

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), 'video-uploads'),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4 and MOV files are allowed.'));
    }
  },
});

// Supported languages based on model capabilities
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];

/**
 * Validate language pair support
 */
function validateLanguagePair(sourceLanguage: string, targetLanguage: string): { valid: boolean; error?: string } {
  if (!SUPPORTED_LANGUAGES.includes(sourceLanguage)) {
    return { valid: false, error: `Source language '${sourceLanguage}' is not supported` };
  }
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    return { valid: false, error: `Target language '${targetLanguage}' is not supported` };
  }
  if (sourceLanguage === targetLanguage) {
    return { valid: false, error: 'Source and target languages must be different' };
  }
  return { valid: true };
}

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  sourceLanguage: z.string().length(2).refine(
    (lang) => SUPPORTED_LANGUAGES.includes(lang),
    { message: 'Unsupported source language' }
  ),
  targetLanguage: z.string().length(2).refine(
    (lang) => SUPPORTED_LANGUAGES.includes(lang),
    { message: 'Unsupported target language' }
  ),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sourceLanguage: z.string().length(2).refine(
    (lang) => SUPPORTED_LANGUAGES.includes(lang),
    { message: 'Unsupported source language' }
  ).optional(),
  targetLanguage: z.string().length(2).refine(
    (lang) => SUPPORTED_LANGUAGES.includes(lang),
    { message: 'Unsupported target language' }
  ).optional(),
  voiceConfig: z.object({
    type: z.enum(['preset', 'clone']),
    voiceId: z.string(),
    parameters: z.object({
      speed: z.number().min(0.5).max(2.0).optional(),
      pitch: z.number().min(-12).max(12).optional(),
      emotion: z.string().optional(),
      style: z.string().optional(),
    }).optional(),
    speakerMapping: z.record(z.string()).optional(),
  }).optional(),
});

/**
 * GET /api/projects - List user's projects
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        sourceLanguage: true,
        targetLanguage: true,
        duration: true,
        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * POST /api/projects - Create new project
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = createProjectSchema.parse(req.body);

    // Validate language pair
    const languageValidation = validateLanguagePair(body.sourceLanguage, body.targetLanguage);
    if (!languageValidation.valid) {
      res.status(400).json({ error: languageValidation.error });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: body.name,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
        status: 'UPLOADING',
      },
    });

    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * GET /api/projects/:id - Get project details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        transcripts: true,
        translations: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Generate signed URLs for media files
    let videoUrl = null;
    let audioUrl = null;
    let outputVideoUrl = null;

    if (project.videoUrl) {
      videoUrl = await generateSignedUrl(project.videoUrl);
    }
    if (project.audioUrl) {
      audioUrl = await generateSignedUrl(project.audioUrl);
    }
    if (project.outputVideoUrl) {
      outputVideoUrl = await generateSignedUrl(project.outputVideoUrl);
    }

    res.json({
      project: {
        ...project,
        videoUrl,
        audioUrl,
        outputVideoUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * PUT /api/projects/:id - Update project configuration
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;
    const body = updateProjectSchema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Validate language pair if both languages are being updated
    const sourceLanguage = body.sourceLanguage || project.sourceLanguage;
    const targetLanguage = body.targetLanguage || project.targetLanguage;
    
    const languageValidation = validateLanguagePair(sourceLanguage, targetLanguage);
    if (!languageValidation.valid) {
      res.status(400).json({ error: languageValidation.error });
      return;
    }

    // If voice configuration is provided, validate voice exists
    if (body.voiceConfig) {
      if (body.voiceConfig.type === 'clone') {
        const voiceClone = await prisma.voiceClone.findFirst({
          where: {
            id: body.voiceConfig.voiceId,
            userId,
          },
        });

        if (!voiceClone) {
          res.status(400).json({ error: 'Voice clone not found or does not belong to user' });
          return;
        }
      }
      // For preset voices, we could validate against a list, but for now we'll trust the frontend
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: body,
    });

    res.json({ project: updatedProject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * DELETE /api/projects/:id - Delete project
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Delete files from storage
    if (project.videoUrl) {
      await deleteFile(project.videoUrl).catch(console.error);
    }
    if (project.audioUrl) {
      await deleteFile(project.audioUrl).catch(console.error);
    }
    if (project.outputVideoUrl) {
      await deleteFile(project.outputVideoUrl).catch(console.error);
    }

    // Delete project from database (cascade will delete related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * POST /api/projects/:id/upload - Upload video file
 */
router.post(
  '/:id/upload',
  authenticateToken,
  upload.single('video'),
  async (req: Request, res: Response) => {
    let tempFilePath: string | null = null;

    try {
      const userId = req.user!.userId;
      const projectId = req.params.id;

      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      tempFilePath = req.file.path;

      // Verify project exists and belongs to user
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Check subscription quota
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Send initial progress
      wsManager.sendUploadProgress(projectId, 10, 'Validating video file...');

      // Validate video
      const validation = await validateVideo(tempFilePath, req.file.size);

      if (!validation.valid) {
        wsManager.sendError(projectId, validation.errors.join(', '));
        res.status(400).json({
          error: 'Video validation failed',
          details: validation.errors,
        });
        return;
      }

      const metadata = validation.metadata!;
      const durationMinutes = metadata.duration / 60;

      // Check if user has enough quota
      const remainingMinutes = user.processingMinutesLimit - user.processingMinutesUsed;
      if (durationMinutes > remainingMinutes) {
        wsManager.sendError(
          projectId,
          `Insufficient quota. Video duration: ${durationMinutes.toFixed(1)} min, Available: ${remainingMinutes.toFixed(1)} min`
        );
        res.status(403).json({
          error: 'Insufficient processing quota',
          details: {
            videoDuration: durationMinutes,
            remainingQuota: remainingMinutes,
          },
        });
        return;
      }

      wsManager.sendUploadProgress(projectId, 30, 'Uploading video to storage...');

      // Upload video to S3
      const videoKey = generateStorageKey(
        userId,
        projectId,
        req.file.originalname,
        'videos'
      );

      if (!tempFilePath) {
        throw new Error('Temporary file path is null');
      }
      const videoBuffer = await fs.readFile(tempFilePath);
      await uploadFile(videoKey, videoBuffer, {
        contentType: req.file.mimetype,
        userId,
        projectId,
        metadata: {
          originalName: req.file.originalname,
          duration: metadata.duration.toString(),
          width: metadata.width.toString(),
          height: metadata.height.toString(),
        },
      });

      wsManager.sendUploadProgress(projectId, 60, 'Extracting audio...');

      // Extract audio
      const audioTempPath = path.join(os.tmpdir(), `audio-${projectId}.wav`);
      if (!tempFilePath) {
        throw new Error('Temporary file path is null');
      }
      await extractAudio(tempFilePath, audioTempPath);

      wsManager.sendUploadProgress(projectId, 80, 'Uploading audio to storage...');

      // Upload audio to S3
      const audioKey = generateStorageKey(userId, projectId, 'extracted-audio.wav', 'audio');
      const audioBuffer = await fs.readFile(audioTempPath);
      await uploadFile(audioKey, audioBuffer, {
        contentType: 'audio/wav',
        userId,
        projectId,
      });

      // Clean up temp audio file
      await fs.unlink(audioTempPath).catch(console.error);

      wsManager.sendUploadProgress(projectId, 90, 'Finalizing...');

      // Update project with video and audio URLs
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          videoUrl: videoKey,
          audioUrl: audioKey,
          duration: Math.floor(metadata.duration),
          status: 'PROCESSING',
        },
      });

      // Create initial STT job
      await prisma.job.create({
        data: {
          projectId,
          stage: 'STT',
          status: 'PENDING',
          progress: 0,
        },
      });

      wsManager.sendUploadProgress(projectId, 100, 'Upload complete!');
      wsManager.sendComplete(projectId, 'Video uploaded successfully. Processing will begin shortly.');

      res.json({
        message: 'Video uploaded successfully',
        project: updatedProject,
        metadata: {
          duration: metadata.duration,
          format: metadata.format,
          resolution: `${metadata.width}x${metadata.height}`,
        },
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      
      if (req.params.id) {
        wsManager.sendError(
          req.params.id,
          error instanceof Error ? error.message : 'Upload failed'
        );
      }

      res.status(500).json({
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Clean up temp file
      if (tempFilePath && typeof tempFilePath === 'string') {
        await fs.unlink(tempFilePath).catch(console.error);
      }
    }
  }
);

/**
 * GET /api/projects/:id/status - Get project processing status
 */
router.get('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Find current active job
    const currentJob = project.jobs.find(
      (job: any) => job.status === 'PROCESSING' || job.status === 'PENDING'
    );

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | null = null;
    if (currentJob && project.duration) {
      // Rough estimates based on stage (in seconds per minute of video)
      const stageEstimates: Record<string, number> = {
        STT: 30,      // 30 seconds per minute of video
        MT: 10,       // 10 seconds per minute of video
        TTS: 60,      // 60 seconds per minute of video
        MUXING: 5,    // 5 seconds per minute of video
        LIPSYNC: 120, // 120 seconds per minute of video
      };

      const videoDurationMinutes = project.duration / 60;
      const stageEstimate = stageEstimates[currentJob.stage] || 30;
      const totalStageTime = videoDurationMinutes * stageEstimate;
      const remainingProgress = 100 - currentJob.progress;
      estimatedTimeRemaining = Math.ceil((totalStageTime * remainingProgress) / 100);
    }

    // Get failed jobs with error messages
    const failedJobs = project.jobs.filter((job: any) => job.status === 'FAILED');
    const errors = failedJobs.map((job: any) => ({
      stage: job.stage,
      message: job.errorMessage,
      timestamp: job.completedAt || job.createdAt,
    }));

    // Calculate overall progress (percentage across all stages)
    const stageWeights: Record<string, number> = {
      STT: 20,
      MT: 15,
      TTS: 30,
      MUXING: 10,
      LIPSYNC: 25,
    };

    let overallProgress = 0;
    const completedJobs = project.jobs.filter((job: any) => job.status === 'COMPLETED');
    
    for (const job of completedJobs) {
      overallProgress += stageWeights[job.stage] || 0;
    }

    if (currentJob) {
      const currentStageWeight = stageWeights[currentJob.stage] || 0;
      overallProgress += (currentStageWeight * currentJob.progress) / 100;
    }

    res.json({
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      currentStage: currentJob?.stage || null,
      stageProgress: currentJob?.progress || 0,
      overallProgress: Math.min(Math.round(overallProgress), 100),
      estimatedTimeRemaining,
      duration: project.duration,
      sourceLanguage: project.sourceLanguage,
      targetLanguage: project.targetLanguage,
      jobs: project.jobs.map((job: any) => ({
        id: job.id,
        stage: job.stage,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error fetching project status:', error);
    res.status(500).json({ error: 'Failed to fetch project status' });
  }
});

/**
 * GET /api/projects/:id/transcript/quality - Get transcript quality metrics
 */
router.get('/:id/transcript/quality', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.transcripts.length === 0) {
      res.status(404).json({ error: 'No transcript found for this project' });
      return;
    }

    const transcript = project.transcripts[0];
    const transcriptData = transcript.content as unknown as Transcript;

    // Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(transcriptData);

    // Flag segments for review
    const segmentFlags = flagSegmentsForReview(transcriptData.segments);

    // Check if meets minimum quality
    const qualityCheck = meetsMinimumQuality(qualityMetrics);

    res.json({
      transcriptId: transcript.id,
      qualityMetrics,
      segmentFlags,
      meetsMinimumQuality: qualityCheck.passes,
      qualityCheckReason: qualityCheck.reason,
    });
  } catch (error) {
    console.error('Error fetching transcript quality:', error);
    res.status(500).json({ error: 'Failed to fetch transcript quality metrics' });
  }
});

/**
 * GET /api/projects/:id/transcript - Get transcript for a project
 */
router.get('/:id/transcript', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.transcripts.length === 0) {
      res.status(404).json({ error: 'No transcript found for this project' });
      return;
    }

    const transcript = project.transcripts[0];

    // Return edited content if available, otherwise original content
    const content = transcript.editedContent || transcript.content;

    res.json({
      transcriptId: transcript.id,
      projectId: project.id,
      content,
      approved: transcript.approved,
      confidence: transcript.confidence,
      speakerCount: transcript.speakerCount,
      hasEdits: transcript.editedContent !== null,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// Validation schema for transcript updates
const updateTranscriptSchema = z.object({
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      speaker: z.string().optional(),
      confidence: z.number().optional(),
      words: z.array(
        z.object({
          word: z.string(),
          start: z.number(),
          end: z.number(),
          confidence: z.number().optional(),
        })
      ).optional(),
    })
  ),
  text: z.string().optional(),
});

/**
 * PUT /api/projects/:id/transcript - Update transcript for a project
 */
router.put('/:id/transcript', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.transcripts.length === 0) {
      res.status(404).json({ error: 'No transcript found for this project' });
      return;
    }

    const transcript = project.transcripts[0];

    // Validate request body
    const body = updateTranscriptSchema.parse(req.body);

    // Get original content
    const originalContent = transcript.content as unknown as Transcript;

    // Create edited content preserving timestamps
    const segments = body.segments.map((segment, index) => {
      const originalSegment = originalContent.segments[index];
      
      // Ensure words have proper confidence values
      const words = (segment.words || originalSegment?.words || []).map(word => ({
        word: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence ?? 1.0,
      }));
      
      return {
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        speaker: segment.speaker || originalSegment?.speaker || 'SPEAKER_00',
        confidence: segment.confidence || originalSegment?.confidence || 1.0,
        words,
      };
    });

    // Calculate speaker count
    const uniqueSpeakers = new Set(segments.map(s => s.speaker));
    
    const editedContent: Transcript = {
      text: body.text || segments.map(s => s.text).join(' '),
      duration: originalContent.duration,
      language: originalContent.language,
      segments,
      speakerCount: uniqueSpeakers.size,
    };

    // Update transcript with edited content
    const updatedTranscript = await prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        editedContent: editedContent as any,
        updatedAt: new Date(),
      },
    });

    res.json({
      transcriptId: updatedTranscript.id,
      projectId: project.id,
      content: editedContent,
      approved: updatedTranscript.approved,
      message: 'Transcript updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error updating transcript:', error);
    res.status(500).json({ error: 'Failed to update transcript' });
  }
});

/**
 * GET /api/projects/:id/translation - Get translation for a project
 */
router.get('/:id/translation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        translations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.translations.length === 0) {
      res.status(404).json({ error: 'No translation found for this project' });
      return;
    }

    const translation = project.translations[0];
    const transcript = project.transcripts[0];

    // Return edited content if available, otherwise original content
    const content = translation.editedContent || translation.content;
    const sourceContent = transcript?.editedContent || transcript?.content;

    res.json({
      translationId: translation.id,
      projectId: project.id,
      targetLanguage: translation.targetLanguage,
      content,
      sourceContent,
      approved: translation.approved,
      glossaryApplied: translation.glossaryApplied,
      hasEdits: translation.editedContent !== null,
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching translation:', error);
    res.status(500).json({ error: 'Failed to fetch translation' });
  }
});

// Validation schema for translation updates
const updateTranslationSchema = z.object({
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      sourceText: z.string().optional(),
      speaker: z.string().optional(),
    })
  ),
  text: z.string().optional(),
});

/**
 * PUT /api/projects/:id/translation - Update translation for a project
 */
router.put('/:id/translation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        translations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.translations.length === 0) {
      res.status(404).json({ error: 'No translation found for this project' });
      return;
    }

    const translation = project.translations[0];

    // Validate request body
    const body = updateTranslationSchema.parse(req.body);

    // Get original content
    const originalContent = translation.content as any;

    // Create edited content preserving timestamps and structure
    const editedContent = {
      text: body.text || body.segments.map(s => s.text).join(' '),
      duration: originalContent.duration,
      language: translation.targetLanguage,
      segments: body.segments.map((segment, index) => {
        const originalSegment = originalContent.segments?.[index];
        
        return {
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          sourceText: segment.sourceText || originalSegment?.sourceText || '',
          speaker: segment.speaker || originalSegment?.speaker || 'SPEAKER_00',
        };
      }),
    };

    // Update translation with edited content
    const updatedTranslation = await prisma.translation.update({
      where: { id: translation.id },
      data: {
        editedContent: editedContent as any,
        updatedAt: new Date(),
      },
    });

    res.json({
      translationId: updatedTranslation.id,
      projectId: project.id,
      content: editedContent,
      approved: updatedTranslation.approved,
      message: 'Translation updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

// Validation schema for stage approval
const approveStageSchema = z.object({
  stage: z.enum(['STT', 'MT']),
});

/**
 * POST /api/projects/:id/approve-stage - Approve a stage and trigger next pipeline stage
 */
router.post('/:id/approve-stage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    // Validate request body
    const body = approveStageSchema.parse(req.body);
    const { stage } = body;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        translations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        jobs: {
          where: { stage },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Validate that the stage is complete
    if (project.jobs.length === 0) {
      res.status(400).json({ 
        error: `No ${stage} job found for this project. The stage must be completed before approval.` 
      });
      return;
    }

    const stageJob = project.jobs[0];
    if (stageJob.status !== 'COMPLETED') {
      res.status(400).json({ 
        error: `${stage} stage is not complete. Current status: ${stageJob.status}` 
      });
      return;
    }

    // Handle approval based on stage
    if (stage === 'STT') {
      // Validate transcript exists
      if (project.transcripts.length === 0) {
        res.status(404).json({ error: 'No transcript found for this project' });
        return;
      }

      const transcript = project.transcripts[0];

      // Check if already approved
      if (transcript.approved) {
        res.status(400).json({ error: 'Transcript is already approved' });
        return;
      }

      // Mark transcript as approved
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { approved: true },
      });

      // Check if user has glossary terms for this language pair
      const glossaryCount = await prisma.glossary.count({
        where: {
          userId,
          sourceLanguage: project.sourceLanguage,
          targetLanguage: project.targetLanguage,
        },
      });

      // Import jobManager
      const { jobManager } = await import('../lib/job-manager');

      // Start MT stage
      const jobId = await jobManager.startMTStage(
        projectId,
        userId,
        transcript.id,
        project.sourceLanguage,
        project.targetLanguage,
        glossaryCount > 0
      );

      // Update project status
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'PROCESSING' },
      });

      res.json({
        message: 'Transcript approved. Translation stage started.',
        stage: 'STT',
        nextStage: 'MT',
        transcriptId: transcript.id,
        jobId,
      });
      return;
    }

    if (stage === 'MT') {
      // Validate translation exists
      if (project.translations.length === 0) {
        res.status(404).json({ error: 'No translation found for this project' });
        return;
      }

      const translation = project.translations[0];

      // Check if already approved
      if (translation.approved) {
        res.status(400).json({ error: 'Translation is already approved' });
        return;
      }

      // Verify voice configuration exists
      if (!project.voiceConfig) {
        res.status(400).json({ 
          error: 'Voice configuration is required before approving translation. Please configure voices first.' 
        });
        return;
      }

      // Mark translation as approved
      await prisma.translation.update({
        where: { id: translation.id },
        data: { approved: true },
      });

      // Import jobManager
      const { jobManager } = await import('../lib/job-manager');

      // Start TTS stage
      const jobId = await jobManager.startTTSStage(
        projectId,
        userId,
        translation.id,
        project.voiceConfig,
        project.targetLanguage
      );

      // Update project status
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'PROCESSING' },
      });

      res.json({
        message: 'Translation approved. Voice generation stage started.',
        stage: 'MT',
        nextStage: 'TTS',
        translationId: translation.id,
        jobId,
      });
      return;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    console.error('Error approving stage:', error);
    res.status(500).json({ error: 'Failed to approve stage' });
  }
});

export default router;
