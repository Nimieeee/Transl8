/**
 * Model Adapter Layer - Public API
 * 
 * This module exports all adapter interfaces, types, and base classes
 * for use throughout the application.
 */

export {
  // Abstract base classes
  STTAdapter,
  MTAdapter,
  TTSAdapter,
  LipSyncAdapter,
  VocalIsolationAdapter,
  EmotionAnalysisAdapter,
  
  // Result types
  type STTResult,
  type MTResult,
  type TTSResult,
  type LipSyncResult,
  type VocalIsolationResult,
  type EmotionAnalysisResult,
  
  // Data structure types
  type Transcript,
  type TranscriptSegment,
  type WordTiming,
  type Translation,
  type TranslationSegment,
  type AudioSegment,
  
  // Configuration types
  type VoiceConfig,
  type SpeakerVoiceMapping,
  
  // Metadata types
  type AdapterMetadata,
  type HealthCheckResult,
  
  // Emotion types
  EmotionTag,
} from './types';

export {
  // Model registry
  ModelRegistry,
  modelRegistry,
  type PipelineStage,
  type ModelAdapter,
  type ModelConfig,
  type ModelHealth,
} from './model-registry';

export {
  // Configuration loader
  loadModelConfig,
  saveModelConfig,
  getStageConfigs,
  getDefaultModel,
  getHealthCheckConfig,
  updateModelInConfig,
  addModelToConfig,
  removeModelFromConfig,
  setDefaultModel,
} from './config-loader';

export {
  // Concrete adapter implementations (Our Pipeline)
  OpenAIWhisperAdapter,
} from './openai-whisper-adapter';

export {
  DemucsAdapter,
} from './demucs-adapter';

export {
  NoisereduceAdapter,
} from './noisereduce-adapter';

export {
  Wav2Vec2EmotionAdapter,
} from './emotion-adapter';

export {
  OpenVoiceAdapter,
} from './openvoice-adapter';
