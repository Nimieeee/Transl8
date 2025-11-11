// User types
export type SubscriptionTier = 'free' | 'creator' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  processingMinutesUsed: number;
  processingMinutesLimit: number;
  voiceCloneSlots: number;
}

// Project types
export type ProjectStatus = 'uploading' | 'processing' | 'review' | 'completed' | 'failed';

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: ProjectStatus;
  sourceLanguage: string;
  targetLanguages: string[];
  videoUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

// Job types
export type PipelineStage = 'stt' | 'mt' | 'tts' | 'lipsync' | 'muxing';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  projectId: string;
  stage: PipelineStage;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Transcript types
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
  text: string;
  duration: number;
  language: string;
  segments: TranscriptSegment[];
}

// Voice types
export type VoiceType = 'preset' | 'clone';

export interface VoiceConfig {
  type: VoiceType;
  voiceId: string;
  parameters: {
    speed: number;
    pitch: number;
    emotion: string;
    style: string;
  };
  speakerMapping?: Record<string, string>;
}

// Context Map types
export type EmotionTag = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'fearful' | 'surprised' | 'disgusted';
export type SegmentStatus = 'pending' | 'success' | 'failed_adaptation' | 'failed_tts' | 'failed_vocal_isolation';

export interface ContextMapSegment {
  id: number;
  start_ms: number;
  end_ms: number;
  duration: number;
  text: string;
  speaker: string;
  confidence: number;
  clean_prompt_path?: string;
  emotion?: EmotionTag;
  previous_line?: string | null;
  next_line?: string | null;
  adapted_text?: string;
  status?: SegmentStatus;
  attempts?: number;
  generated_audio_path?: string;
  validation_feedback?: string;
}

export interface ContextMap {
  project_id: string;
  original_duration_ms: number;
  source_language: string;
  target_language: string;
  created_at: string;
  updated_at: string;
  segments: ContextMapSegment[];
}

// Error types
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}
