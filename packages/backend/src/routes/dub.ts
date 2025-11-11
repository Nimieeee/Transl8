import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

const router = Router();

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept MP4, MOV, MKV, and AVI files
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',      // .mov
      'video/x-matroska',     // .mkv
      'video/x-msvideo',      // .avi
    ];
    
    const allowedExtensions = ['.mp4', '.mov', '.mkv', '.avi'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4, MOV, MKV, and AVI video files are allowed'));
    }
  },
});

// Create STT queue to start the pipeline
const sttQueue = new Queue('stt', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600,
    },
  },
});

/**
 * POST /api/dub/upload
 * Upload video and start dubbing job (MVP: no auth required)
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No video file provided',
          retryable: false,
        },
      });
      return;
    }

    // Get target language from request body (default to Spanish)
    const targetLanguage = req.body.targetLanguage || 'es';
    const sourceLanguage = req.body.sourceLanguage || 'en';

    // Validate language selection (MVP: English to Spanish or French)
    const supportedTargets = ['es', 'fr'];
    if (sourceLanguage !== 'en' || !supportedTargets.includes(targetLanguage)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.status(400).json({
        error: {
          code: 'INVALID_LANGUAGE',
          message: 'MVP supports English to Spanish or French translation',
          retryable: false,
        },
      });
      return;
    }

    // Create DubbingJob record in database (MVP: no userId required)
    const job = await prisma.dubbingJob.create({
      data: {
        status: 'pending',
        progress: 0,
        originalFile: req.file.path,
        sourceLanguage,
        targetLanguage,
      },
    });

    // Queue job for STT processing (start of pipeline)
    await sttQueue.add('transcribe', {
      projectId: job.id,
      userId: null, // MVP: no auth
      videoPath: req.file.path,
      sourceLanguage,
      targetLanguage,
      stage: 'STT',
    });

    // Return job ID to client
    res.status(201).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: 'Video uploaded successfully and queued for processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 1GB limit',
            retryable: false,
          },
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during upload',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/dub/status/:jobId
 * Get dubbing job status (MVP: no auth required)
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Fetch job from database
    const job = await prisma.dubbingJob.findUnique({
      where: { id: jobId },
    });

    // Check if job exists
    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Dubbing job not found',
          retryable: false,
        },
      });
      return;
    }

    // Return current job status, progress, error, and output file if available
    res.status(200).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error || null,
      outputFile: job.outputFile || null,
      createdAt: job.createdAt,
      completedAt: job.completedAt || null,
      expiresAt: job.expiresAt || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking status',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/dub/download/:jobId
 * Download completed dubbed video (MVP: no auth required)
 */
router.get('/download/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Fetch job from database
    const job = await prisma.dubbingJob.findUnique({
      where: { id: jobId },
    });

    // Check if job exists
    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Dubbing job not found',
          retryable: false,
        },
      });
      return;
    }

    // Verify job is completed
    if (job.status !== 'completed') {
      res.status(400).json({
        error: {
          code: 'JOB_NOT_COMPLETED',
          message: `Job is not completed yet. Current status: ${job.status}`,
          retryable: job.status === 'processing' || job.status === 'pending',
        },
      });
      return;
    }

    // Verify job has output file
    if (!job.outputFile) {
      res.status(404).json({
        error: {
          code: 'OUTPUT_FILE_NOT_FOUND',
          message: 'Output file not found for this job',
          retryable: false,
        },
      });
      return;
    }

    // Check if job has expired
    if (job.expiresAt && new Date() > job.expiresAt) {
      res.status(410).json({
        error: {
          code: 'JOB_EXPIRED',
          message: 'This job has expired and the video is no longer available',
          retryable: false,
        },
      });
      return;
    }

    // Resolve output file path (workers store in their temp directory)
    let outputFilePath = job.outputFile;
    
    // If path is relative, check both backend and workers temp directories
    if (!path.isAbsolute(outputFilePath)) {
      const backendPath = path.join(process.cwd(), outputFilePath);
      const workersPath = path.join(process.cwd(), '..', 'workers', outputFilePath);
      
      if (fs.existsSync(backendPath)) {
        outputFilePath = backendPath;
      } else if (fs.existsSync(workersPath)) {
        outputFilePath = workersPath;
      }
    }
    
    // Check if output file exists on filesystem
    if (!fs.existsSync(outputFilePath)) {
      res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Output file not found on server',
          retryable: false,
        },
      });
      return;
    }

    // Get file stats for content length
    const stat = fs.statSync(outputFilePath);
    const filename = path.basename(outputFilePath);

    // Set headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="dubbed-${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream video file to client
    const fileStream = fs.createReadStream(outputFilePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'STREAM_ERROR',
            message: 'Error streaming video file',
            retryable: true,
          },
        });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during download',
          retryable: true,
        },
      });
    }
  }
});

export default router;
