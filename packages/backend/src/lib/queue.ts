import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis';

// Define job stages
export type JobStage =
  | 'STT'
  | 'MT'
  | 'TTS'
  | 'MUXING'
  | 'LIPSYNC'
  | 'VOCAL_ISOLATION'
  | 'EMOTION_ANALYSIS'
  | 'ADAPTATION'
  | 'FINAL_ASSEMBLY';

// Queue configuration with exponential backoff retry
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // Start with 5 seconds, then 15s, 45s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
};

// Job data interfaces
export interface BaseJobData {
  projectId: string;
  userId: string;
  stage: JobStage;
}

export interface STTJobData extends BaseJobData {
  stage: 'STT';
  videoPath: string; // MVP: local file path instead of URL
  sourceLanguage: string;
  targetLanguage: string;
}

export interface MTJobData extends BaseJobData {
  stage: 'MT';
  transcriptId: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaryEnabled: boolean;
}

export interface TTSJobData extends BaseJobData {
  stage: 'TTS';
  translationId: string;
  voiceConfig: any;
  targetLanguage: string;
}

export interface MuxingJobData extends BaseJobData {
  stage: 'MUXING';
  videoUrl: string;
  audioUrl: string;
  applyWatermark: boolean;
}

export interface LipSyncJobData extends BaseJobData {
  stage: 'LIPSYNC';
  videoUrl: string;
  audioUrl: string;
}

export interface VocalIsolationJobData extends BaseJobData {
  stage: 'VOCAL_ISOLATION';
  audioUrl: string;
  segments: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker: string;
  }>;
  outputDir: string;
}

export interface EmotionAnalysisJobData extends BaseJobData {
  stage: 'EMOTION_ANALYSIS';
  segments: Array<{
    id: number;
    clean_prompt_path: string;
    duration: number;
  }>;
}

export interface AdaptationJobData extends BaseJobData {
  stage: 'ADAPTATION';
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
  concurrency?: number;
}

export interface FinalAssemblyJobData extends BaseJobData {
  stage: 'FINAL_ASSEMBLY';
  contextMapPath?: string;
}

export type JobData =
  | STTJobData
  | MTJobData
  | TTSJobData
  | MuxingJobData
  | LipSyncJobData
  | VocalIsolationJobData
  | EmotionAnalysisJobData
  | AdaptationJobData
  | FinalAssemblyJobData;

// Create queues for each pipeline stage
export const sttQueue = new Queue<STTJobData>('stt', queueConfig);
export const mtQueue = new Queue<MTJobData>('mt', queueConfig);
export const ttsQueue = new Queue<TTSJobData>('tts', queueConfig);
export const muxingQueue = new Queue<MuxingJobData>('muxing', queueConfig);
export const lipSyncQueue = new Queue<LipSyncJobData>('lipsync', queueConfig);
export const vocalIsolationQueue = new Queue<VocalIsolationJobData>('vocal-isolation', queueConfig);
export const emotionAnalysisQueue = new Queue<EmotionAnalysisJobData>(
  'emotion-analysis',
  queueConfig
);
export const adaptationQueue = new Queue<AdaptationJobData>('adaptation', queueConfig);
export const finalAssemblyQueue = new Queue<FinalAssemblyJobData>('final-assembly', queueConfig);

// Queue events for monitoring
export const sttQueueEvents = new QueueEvents('stt', { connection: redis });
export const mtQueueEvents = new QueueEvents('mt', { connection: redis });
export const ttsQueueEvents = new QueueEvents('tts', { connection: redis });
export const muxingQueueEvents = new QueueEvents('muxing', { connection: redis });
export const lipSyncQueueEvents = new QueueEvents('lipsync', { connection: redis });
export const vocalIsolationQueueEvents = new QueueEvents('vocal-isolation', { connection: redis });
export const emotionAnalysisQueueEvents = new QueueEvents('emotion-analysis', {
  connection: redis,
});
export const adaptationQueueEvents = new QueueEvents('adaptation', { connection: redis });
export const finalAssemblyQueueEvents = new QueueEvents('final-assembly', { connection: redis });

// Map stage to queue
export const queueMap = {
  STT: sttQueue,
  MT: mtQueue,
  TTS: ttsQueue,
  MUXING: muxingQueue,
  LIPSYNC: lipSyncQueue,
  VOCAL_ISOLATION: vocalIsolationQueue,
  EMOTION_ANALYSIS: emotionAnalysisQueue,
  ADAPTATION: adaptationQueue,
  FINAL_ASSEMBLY: finalAssemblyQueue,
} as const;

// Map stage to queue events
export const queueEventsMap = {
  STT: sttQueueEvents,
  MT: mtQueueEvents,
  TTS: ttsQueueEvents,
  MUXING: muxingQueueEvents,
  LIPSYNC: lipSyncQueueEvents,
  VOCAL_ISOLATION: vocalIsolationQueueEvents,
  EMOTION_ANALYSIS: emotionAnalysisQueueEvents,
  ADAPTATION: adaptationQueueEvents,
  FINAL_ASSEMBLY: finalAssemblyQueueEvents,
} as const;

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats(stage: JobStage) {
  const queue = queueMap[stage as keyof typeof queueMap];

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    stage,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get statistics for all queues
 */
export async function getAllQueueStats() {
  const stages: JobStage[] = ['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'];
  const stats = await Promise.all(stages.map((stage) => getQueueStats(stage)));

  return stats.reduce(
    (acc, stat) => {
      acc[stat.stage] = stat;
      return acc;
    },
    {} as Record<JobStage, Awaited<ReturnType<typeof getQueueStats>>>
  );
}

/**
 * Pause a queue
 */
export async function pauseQueue(stage: JobStage): Promise<void> {
  const queue = queueMap[stage as keyof typeof queueMap];
  await queue.pause();
}

/**
 * Resume a queue
 */
export async function resumeQueue(stage: JobStage): Promise<void> {
  const queue = queueMap[stage as keyof typeof queueMap];
  await queue.resume();
}

/**
 * Clean completed jobs from a queue
 */
export async function cleanQueue(stage: JobStage, grace: number = 3600): Promise<void> {
  const queue = queueMap[stage as keyof typeof queueMap];
  await queue.clean(grace * 1000, 100, 'completed');
  await queue.clean(grace * 1000, 100, 'failed');
}

/**
 * Obliterate a queue (remove all jobs and data)
 */
export async function obliterateQueue(stage: JobStage): Promise<void> {
  const queue = queueMap[stage as keyof typeof queueMap];
  await queue.obliterate({ force: true });
}

/**
 * Close all queues and queue events
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    sttQueue.close(),
    mtQueue.close(),
    ttsQueue.close(),
    muxingQueue.close(),
    lipSyncQueue.close(),
    vocalIsolationQueue.close(),
    emotionAnalysisQueue.close(),
    adaptationQueue.close(),
    finalAssemblyQueue.close(),
    sttQueueEvents.close(),
    mtQueueEvents.close(),
    ttsQueueEvents.close(),
    muxingQueueEvents.close(),
    lipSyncQueueEvents.close(),
    vocalIsolationQueueEvents.close(),
    emotionAnalysisQueueEvents.close(),
    adaptationQueueEvents.close(),
    finalAssemblyQueueEvents.close(),
  ]);
}
