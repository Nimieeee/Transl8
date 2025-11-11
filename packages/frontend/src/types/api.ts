export interface User {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'creator' | 'pro' | 'enterprise';
  processingMinutesUsed: number;
  processingMinutesLimit: number;
  voiceCloneSlots: number;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: 'uploading' | 'processing' | 'review' | 'completed' | 'failed';
  sourceLanguage: string;
  targetLanguage: string;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  stage: 'stt' | 'mt' | 'tts' | 'lipsync' | 'muxing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface Transcript {
  id: string;
  projectId: string;
  text: string;
  duration: number;
  language: string;
  segments: TranscriptSegment[];
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Translation {
  id: string;
  projectId: string;
  targetLanguage: string;
  segments: Array<{
    id: number;
    sourceText: string;
    translatedText: string;
    start: number;
    end: number;
    speaker: string;
  }>;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  style?: string;
  gender?: 'male' | 'female' | 'neutral';
  sampleUrl?: string;
  isPreset: boolean;
}

export interface VoiceClone {
  id: string;
  userId: string;
  name: string;
  language: string;
  sampleAudioUrl: string;
  createdAt: string;
}

export interface VoiceConfig {
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

export interface Subscription {
  tier: 'free' | 'creator' | 'pro' | 'enterprise';
  processingMinutesUsed: number;
  processingMinutesLimit: number;
  voiceCloneSlots: number;
  voiceClonesUsed: number;
  features: {
    watermarkRemoval: boolean;
    lipSync: boolean;
    priorityProcessing: boolean;
    apiAccess: boolean;
  };
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ProjectStatus {
  project: Project;
  currentJob?: ProcessingJob;
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
}
