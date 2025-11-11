/**
 * Database type definitions and interfaces
 * These extend Prisma types with application-specific types
 */

import {
  User,
  Project,
  Transcript,
  Translation,
  VoiceClone,
  Job,
  Glossary,
  SubscriptionTier,
  ProjectStatus,
  JobStage,
  JobStatus,
} from '@prisma/client';

// Re-export Prisma types
export {
  User,
  Project,
  Transcript,
  Translation,
  VoiceClone,
  Job,
  Glossary,
  SubscriptionTier,
  ProjectStatus,
  JobStage,
  JobStatus,
};

// User types
export type UserWithoutPassword = Omit<User, 'passwordHash'>;

export interface UserRegistrationData {
  email: string;
  password: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

// Project types
export interface ProjectWithRelations extends Project {
  transcripts?: Transcript[];
  translations?: Translation[];
  jobs?: Job[];
}

export interface CreateProjectData {
  userId: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface UpdateProjectData {
  name?: string;
  status?: ProjectStatus;
  videoUrl?: string;
  audioUrl?: string;
  outputVideoUrl?: string;
  duration?: number;
  thumbnailUrl?: string;
  voiceConfig?: VoiceConfiguration;
}

// Voice configuration types
export interface VoiceConfiguration {
  type: 'preset' | 'clone';
  voiceId: string;
  parameters?: {
    speed?: number;
    pitch?: number;
    emotion?: string;
    style?: string;
  };
  speakerMapping?: Record<string, string>;
}

// Transcript types
export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
  confidence: number;
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptContent {
  text: string;
  duration: number;
  language: string;
  segments: TranscriptSegment[];
}

export interface CreateTranscriptData {
  projectId: string;
  content: TranscriptContent;
  confidence?: number;
  speakerCount?: number;
}

export interface UpdateTranscriptData {
  editedContent?: TranscriptContent;
  approved?: boolean;
}

// Translation types
export interface TranslationSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
  sourceText?: string;
}

export interface TranslationContent {
  segments: TranslationSegment[];
}

export interface CreateTranslationData {
  projectId: string;
  targetLanguage: string;
  content: TranslationContent;
  glossaryApplied?: boolean;
}

export interface UpdateTranslationData {
  editedContent?: TranslationContent;
  approved?: boolean;
}

// Voice clone types
export interface VoiceCloneModelData {
  embeddings: number[];
  modelVersion: string;
  sampleDuration: number;
  [key: string]: any;
}

export interface CreateVoiceCloneData {
  userId: string;
  name: string;
  sampleAudioUrl: string;
  modelData: VoiceCloneModelData;
  language?: string;
  quality?: number;
}

// Job types
export interface JobMetadata {
  processingTime?: number;
  modelVersion?: string;
  currentSegment?: number;
  totalSegments?: number;
  [key: string]: any;
}

export interface CreateJobData {
  projectId: string;
  stage: JobStage;
  status?: JobStatus;
  metadata?: JobMetadata;
}

export interface UpdateJobData {
  status?: JobStatus;
  progress?: number;
  errorMessage?: string;
  metadata?: JobMetadata;
  startedAt?: Date;
  completedAt?: Date;
}

// Glossary types
export interface CreateGlossaryData {
  userId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceTerm: string;
  targetTerm: string;
}

// Subscription tier limits
export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    processingMinutes: number;
    voiceCloneSlots: number;
    hasWatermark: boolean;
    hasLipSync: boolean;
    priority: number;
  }
> = {
  FREE: {
    processingMinutes: 10,
    voiceCloneSlots: 0,
    hasWatermark: true,
    hasLipSync: false,
    priority: 1,
  },
  CREATOR: {
    processingMinutes: 120,
    voiceCloneSlots: 3,
    hasWatermark: false,
    hasLipSync: false,
    priority: 2,
  },
  PRO: {
    processingMinutes: 999999, // Unlimited
    voiceCloneSlots: 10,
    hasWatermark: false,
    hasLipSync: true,
    priority: 3,
  },
  ENTERPRISE: {
    processingMinutes: 999999, // Unlimited
    voiceCloneSlots: 999, // Unlimited
    hasWatermark: false,
    hasLipSync: true,
    priority: 4,
  },
};

// Pipeline stage order
export const PIPELINE_STAGES: JobStage[] = ['STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC'];

// Helper function to get next stage
export function getNextStage(currentStage: JobStage): JobStage | null {
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === PIPELINE_STAGES.length - 1) {
    return null;
  }
  return PIPELINE_STAGES[currentIndex + 1];
}

// Helper function to check if stage requires approval
export function stageRequiresApproval(stage: JobStage): boolean {
  return stage === 'STT' || stage === 'MT';
}
