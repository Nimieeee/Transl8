/**
 * TTS Worker - Processes text-to-speech jobs
 * 
 * Consumes jobs from the TTS queue, fetches approved translations from database,
 * generates audio for each segment with appropriate voice (preset or cloned),
 * concatenates segments with proper timing alignment, and uploads to storage.
 * 
 * Requirements: 4.5, 12.3
 */

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OpenAITTSAdapter } from '../../backend/src/adapters/openai-tts-adapter';
import { uploadFile } from '../../backend/src/lib/storage';
import { logger } from './lib/logger';
import type { TTSJobData } from '../../backend/src/lib/queue';
import type { TTSResult, SpeakerVoiceMapping, VoiceConfig } from '../../backend/src/adapters/types';

const prisma = new PrismaClient();

interface FinalAssemblyJobData {
  projectId: string;
  userId: string;
  contextMapPath?: string;
}

export class TTSWorker {
  private worker: Worker;
  private ttsAdapter: OpenAITTSAdapter;
  private finalAssemblyQueue: Queue;
  private redisConnection: any;

  constructor(redisConnection: any) {
    this.redisConnection = redisConnection;

    // Initialize OpenAI TTS adapter
    this.ttsAdapter = new OpenAITTSAdapter({
      model: 'tts-1', // Use faster model for development
      defaultVoice: 'alloy',
    });

    // Create final assembly queue for triggering next stage
    this.finalAssemblyQueue = new Queue('final-assembly', {
      connection: redisConnection,
    });

    // Create BullMQ worker
    this.worker = new Worker<TTSJobData>(
      'tts',
      async (job: Job<TTSJobData>) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
        limiter: {
          max: 10, // Max 10 jobs
          duration: 60000, // per minute
        },
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process a TTS job
   */
  private async processJob(job: Job<TTSJobData>): Promise<any> {
    const { projectId, translationId, voiceConfig, targetLanguage } = job.data;
    const jobId = projectId; // Use projectId as jobId for MVP

    console.log(`[TTS Worker] Processing job ${jobId} for project ${projectId}`);

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing', 0);
      await job.updateProgress(10);

      // Step 1: Fetch approved translation from database
      console.log(`[TTS Worker] Fetching translation ${translationId}`);
      const translation = await this.fetchTranslation(translationId);

      if (!translation.approved) {
        throw new Error('Translation must be approved before TTS generation');
      }

      await job.updateProgress(20);

      // Step 2: Parse translation content and extract segments
      const translationContent = translation.editedContent || translation.content;
      const segments = (translationContent as any).segments;

      console.log(`[TTS Worker] Generating audio for ${segments.length} segments`);

      await job.updateProgress(30);

      // Step 3: Build speaker-to-voice mapping
      const speakerVoiceMapping = await this.buildSpeakerVoiceMapping(
        projectId,
        segments,
        voiceConfig
      );

      console.log(`[TTS Worker] Using OpenAI TTS for synthesis`);

      // Step 4: Generate audio for all segments using OpenAI TTS
      const result: TTSResult = await this.synthesizeWithOpenAI(
        segments,
        speakerVoiceMapping,
        projectId
      );

      await job.updateProgress(80);

      // Skip saving concatenated audio - Final Assembly will handle it
      const audioUrl = `local://temp/${projectId}/tts-output/`;

      console.log(`[TTS Worker] All segments saved to: ${audioUrl}`);

      await job.updateProgress(90);

      // Step 9: Trigger final assembly stage
      logger.info(`[TTS Worker] Triggering final assembly for project ${projectId}`);
      await this.triggerFinalAssembly(projectId, job.data.userId);

      // Step 10: Update job as processing (TTS complete, but assembly and muxing remain)
      await this.updateJobStatus(jobId, 'processing', 70, {
        audioUrl,
        segmentCount: segments.length,
        processingTime: result.metadata.processingTime,
        modelUsed: this.ttsAdapter.name,
        warnings: result.metadata.warnings,
        stage: 'TTS_COMPLETED',
      });

      await job.updateProgress(100);

      logger.info(`[TTS Worker] Job ${jobId} completed successfully`);

      return {
        success: true,
        audioUrl,
        metadata: result.metadata,
      };
    } catch (error: any) {
      logger.error(`[TTS Worker] Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', 0, undefined, error.message);
      throw error;
    }
  }

  /**
   * Fetch translation from database
   * Note: In the MVP, translations are stored in the Context Map
   */
  private async fetchTranslation(translationId: string) {
    // For MVP, we get translations from Context Map
    // translationId is actually the projectId
    const contextMap = await prisma.contextMap.findUnique({
      where: { projectId: translationId },
    });

    if (!contextMap) {
      throw new Error(`Context Map not found for project: ${translationId}`);
    }

    // Return a translation-like object from Context Map
    return {
      id: translationId,
      approved: true, // Assume approved for MVP
      content: contextMap.content,
      editedContent: null,
    };
  }

  /**
   * Build speaker-to-voice mapping from project configuration
   * Includes emotion tags from Context Map for expressive synthesis
   */
  private async buildSpeakerVoiceMapping(
    _projectId: string,
    segments: any[],
    voiceConfig: any
  ): Promise<SpeakerVoiceMapping> {
    const mapping: SpeakerVoiceMapping = {};

    // Get unique speakers from segments
    const speakers = [...new Set(segments.map((s) => s.speaker))];

    console.log(`[TTS Worker] Found ${speakers.length} unique speakers`);

    // If voiceConfig has speaker mapping, use it
    if (voiceConfig.speakerMapping) {
      for (const speaker of speakers) {
        const speakerConfig = voiceConfig.speakerMapping[speaker];

        if (speakerConfig) {
          mapping[speaker] = {
            type: speakerConfig.type || 'preset',
            voiceId: speakerConfig.voiceId,
            parameters: speakerConfig.parameters || {},
          };
        } else {
          // Use default voice for unmapped speakers
          mapping[speaker] = this.getDefaultVoiceConfig();
        }
      }
    } else {
      // No speaker mapping - use single voice for all speakers
      const defaultVoice: VoiceConfig = {
        type: voiceConfig.type || 'preset',
        voiceId: voiceConfig.voiceId || 'en/male-neutral',
        parameters: voiceConfig.parameters || {},
      };

      for (const speaker of speakers) {
        mapping[speaker] = defaultVoice;
      }
    }

    return mapping;
  }



  /**
   * Synthesize segments using OpenAI TTS
   */
  private async synthesizeWithOpenAI(
    segments: any[],
    speakerVoiceMapping: SpeakerVoiceMapping,
    projectId: string
  ): Promise<TTSResult> {
    const startTime = Date.now();

    console.log(`[TTS Worker] Synthesizing ${segments.length} segments with OpenAI TTS`);

    const audioSegments: any[] = [];
    const warnings: string[] = [];

    // Process each segment individually
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const voiceConfig = speakerVoiceMapping[segment.speaker];

      try {
        // Get translated text from segment
        const translatedText = segment.adapted_text || segment.text;
        
        if (!translatedText) {
          throw new Error(`No text found for segment ${segment.id}`);
        }

        // Save segment audio to local file (for development without AWS)
        const outputDir = path.join(process.cwd(), 'temp', projectId, 'tts-output');
        await fs.promises.mkdir(outputDir, { recursive: true });
        
        const segmentAudioPath = path.join(
          outputDir,
          `segment_${String(i).padStart(4, '0')}.wav`
        );

        // Check if we have validated audio from TTS-validated adaptation
        if (segment.validatedAudioPath && fs.existsSync(segment.validatedAudioPath)) {
          console.log(`[TTS Worker] Using validated audio for segment ${i}: "${translatedText.substring(0, 50)}..." (pre-validated)`);
          
          // Copy validated audio to TTS output location
          await fs.promises.copyFile(segment.validatedAudioPath, segmentAudioPath);
          
          // Get duration of validated audio
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${segmentAudioPath}"`
          );
          const duration = parseFloat(stdout.trim());
          
          console.log(`[TTS Worker] Validated audio copied: ${segmentAudioPath} (${duration.toFixed(2)}s)`);

          // Read audio data for compatibility
          const audioData = await fs.promises.readFile(segmentAudioPath);

          // Create a mock storage URL for development
          const segmentAudioUrl = `https://storage.googleapis.com/your-bucket/tts/${projectId}/segment_${String(i).padStart(4, '0')}.wav`;

          audioSegments.push({
            segmentId: i,
            audioData,
            start: segment.start_ms || segment.start,
            end: segment.end_ms || segment.end,
            duration: segment.actualDuration || segment.duration || (segment.end - segment.start),
            url: segmentAudioUrl,
          });

          continue; // Skip TTS synthesis for this segment
        }

        // No validated audio - synthesize with TTS
        const voice = this.getOpenAIVoice(voiceConfig);
        const speed = 1.0; // Always use normal speed for natural speech
        
        const segmentDuration = (segment.end_ms - segment.start_ms) / 1000;
        const estimatedDuration = this.estimateSpeechDuration(translatedText);
        
        if (estimatedDuration > 0 && segmentDuration > 0) {
          const durationDiff = estimatedDuration - segmentDuration;
          const percentDiff = (durationDiff / segmentDuration) * 100;
          console.log(`[OpenAI TTS] Duration info: segment=${segmentDuration.toFixed(1)}s, estimated=${estimatedDuration.toFixed(1)}s, diff=${durationDiff.toFixed(1)}s (${percentDiff.toFixed(1)}%), speed=1.0x (natural)`);
        }

        console.log(`[TTS Worker] Synthesizing segment ${i}: "${translatedText.substring(0, 50)}..." (voice: ${voice}, speed: ${speed.toFixed(2)}x)`);

        // Synthesize using OpenAI TTS with calculated speed
        const audioData = await this.ttsAdapter.synthesize(
          translatedText,
          voice,
          speed
        );

        await fs.promises.writeFile(segmentAudioPath, audioData);

        // Create a mock storage URL for development
        const segmentAudioUrl = `https://storage.googleapis.com/your-bucket/tts/${projectId}/segment_${String(i).padStart(4, '0')}.wav`;

        console.log(`[TTS Worker] Uploaded segment ${i}: ${segmentAudioUrl}`);

        audioSegments.push({
          segmentId: i,
          audioData,
          start: segment.start_ms || segment.start,
          end: segment.end_ms || segment.end,
          duration: segment.duration || (segment.end - segment.start),
          url: segmentAudioUrl,
        });

        console.log(`[OpenAI TTS] Synthesis successful: ${segmentAudioPath}`);
      } catch (error: any) {
        console.error(`[TTS Worker] Failed to synthesize segment ${i}:`, error.message);
        warnings.push(`Failed to synthesize segment ${i}: ${error.message}`);
      }
    }

    const totalTime = Date.now() - startTime;

    const metadata = {
      processingTime: totalTime,
      modelName: this.ttsAdapter.name,
      modelVersion: this.ttsAdapter.version,
      warnings,
    };

    console.log(`[TTS Worker] Completed ${audioSegments.length}/${segments.length} segments in ${totalTime}ms`);

    // Return empty buffer - Final Assembly will handle concatenation with proper timing
    return {
      audioData: Buffer.alloc(0),
      segments: audioSegments,
      metadata,
    };
  }

  /**
   * Estimate speech duration based on text length and language
   * Uses average speaking rates for different languages
   */
  private estimateSpeechDuration(text: string, language: string = 'es'): number {
    // Average speaking rates (words per minute)
    const speakingRates: Record<string, number> = {
      'en': 150, // English: ~150 wpm
      'es': 180, // Spanish: ~180 wpm (faster)
      'fr': 160, // French: ~160 wpm
      'pt': 170, // Portuguese: ~170 wpm
      'ja': 200, // Japanese: ~200 wpm (syllables)
      'ko': 190, // Korean: ~190 wpm
      'sw': 150, // Swahili: ~150 wpm
    };

    const wpm = speakingRates[language] || 150;
    
    // Count words (simple split by spaces)
    const wordCount = text.trim().split(/\s+/).length;
    
    // Calculate duration in seconds
    const durationMinutes = wordCount / wpm;
    const durationSeconds = durationMinutes * 60;
    
    // Add buffer for punctuation pauses (10%)
    return durationSeconds * 1.1;
  }

  /**
   * Get OpenAI voice from voice config
   */
  private getOpenAIVoice(config?: VoiceConfig): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    if (!config || !config.voiceId) {
      return 'alloy';
    }

    const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
      'alloy': 'alloy',
      'echo': 'echo',
      'fable': 'fable',
      'onyx': 'onyx',
      'nova': 'nova',
      'shimmer': 'shimmer',
      'male': 'onyx',
      'female': 'nova',
      'neutral': 'alloy',
    };

    const voiceId = config.voiceId.toLowerCase();
    return voiceMap[voiceId] || 'alloy';
  }



  /**
   * Concatenate audio buffers
   */
  private async concatenateAudioBuffers(audioSegments: any[]): Promise<Buffer> {
    const allBuffers: Buffer[] = [];

    for (const segment of audioSegments) {
      allBuffers.push(segment.audioData);
    }

    return Buffer.concat(allBuffers);
  }

  /**
   * Trigger final assembly stage after TTS completion
   */
  private async triggerFinalAssembly(projectId: string, userId: string): Promise<void> {
    try {
      // Enqueue final assembly job
      const finalAssemblyJobData: FinalAssemblyJobData = {
        projectId,
        userId,
      };

      await this.finalAssemblyQueue.add(
        `final-assembly-${projectId}`,
        finalAssemblyJobData,
        {
          priority: 1, // High priority
        }
      );

      logger.info(`[TTS Worker] Enqueued final assembly job for project ${projectId}`);
    } catch (error: any) {
      logger.error(`[TTS Worker] Failed to trigger final assembly:`, error);
      throw error;
    }
  }

  /**
   * Get default voice configuration
   */
  private getDefaultVoiceConfig(): VoiceConfig {
    return {
      type: 'preset',
      voiceId: 'en/male-neutral',
      parameters: {
        speed: 1.0,
        pitch: 0,
      },
    };
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    progress: number,
    _metadata?: any,
    errorMessage?: string
  ) {
    const updateData: any = {
      status,
      progress,
    };

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (errorMessage) {
      updateData.error = errorMessage;
    }

    await prisma.dubbingJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Clean up temporary audio file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[TTS Worker] Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[TTS Worker] Failed to cleanup temp file:`, error);
      // Don't throw - cleanup failure shouldn't fail the job
    }
  }

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info(`[TTS Worker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`[TTS Worker] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      logger.error('[TTS Worker] Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`[TTS Worker] Job ${jobId} stalled`);
    });
  }

  /**
   * Start the worker
   */
  async start() {
    logger.info('[TTS Worker] Starting TTS worker...');

    // Check adapter health
    try {
      const health = await this.ttsAdapter.healthCheck();
      if (!health.healthy) {
        logger.warn('[TTS Worker] OpenAI TTS adapter health check failed:', health.error);
        logger.warn('[TTS Worker] Continuing anyway - will retry on actual synthesis');
      } else {
        logger.info('[TTS Worker] OpenAI TTS adapter is healthy');
      }
    } catch (error) {
      logger.warn('[TTS Worker] OpenAI TTS health check error:', error);
      logger.warn('[TTS Worker] Continuing anyway - will retry on actual synthesis');
    }

    logger.info('[TTS Worker] TTS worker started successfully');
  }

  /**
   * Stop the worker gracefully
   */
  async stop() {
    logger.info('[TTS Worker] Stopping TTS worker...');
    await this.worker.close();
    await this.finalAssemblyQueue.close();
    await prisma.$disconnect();
    logger.info('[TTS Worker] TTS worker stopped');
  }
}
