/**
 * Model Adapter Types and Interfaces
 *
 * This module defines the standardized interfaces for all AI model adapters
 * in the video dubbing pipeline. Each adapter implements a specific stage
 * of the processing pipeline (STT, MT, TTS, Lip-Sync).
 *
 * Requirements: 14.1, 14.3
 */

/**
 * Base metadata returned by all adapters
 */
export interface AdapterMetadata {
  processingTime: number; // milliseconds
  modelName: string;
  modelVersion: string;
  confidence?: number; // 0-1 scale
  warnings?: string[];
}

/**
 * Health check result for model adapters
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency?: number; // milliseconds
  error?: string;
  timestamp: Date;
}

/**
 * Word-level timing information
 */
export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number; // seconds
  confidence: number; // 0-1 scale
}

/**
 * Transcript segment with speaker and timing information
 */
export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  speaker: string; // e.g., "SPEAKER_00", "SPEAKER_01"
  confidence: number; // 0-1 scale
  words?: WordTiming[];
}

/**
 * Complete transcript output from STT
 */
export interface Transcript {
  text: string; // Full transcript text
  duration: number; // seconds
  language: string; // ISO 639-1 code
  segments: TranscriptSegment[];
  speakerCount: number;
}

/**
 * STT processing result
 */
export interface STTResult {
  transcript: Transcript;
  metadata: AdapterMetadata;
}

/**
 * Translation segment with timing preserved
 */
export interface TranslationSegment {
  id: number;
  sourceText: string;
  translatedText: string;
  start: number; // seconds
  end: number; // seconds
  speaker: string;
  confidence?: number; // 0-1 scale
}

/**
 * Complete translation output from MT
 */
export interface Translation {
  sourceLanguage: string; // ISO 639-1 code
  targetLanguage: string; // ISO 639-1 code
  segments: TranslationSegment[];
  fullText: string; // Concatenated translation
}

/**
 * MT processing result
 */
export interface MTResult {
  translation: Translation;
  metadata: AdapterMetadata;
}

/**
 * Voice configuration for TTS
 */
export interface VoiceConfig {
  type: 'preset' | 'clone';
  voiceId: string; // Preset name or clone UUID
  parameters?: {
    speed?: number; // 0.5-2.0, default 1.0
    pitch?: number; // -12 to +12 semitones, default 0
    emotion?: string; // e.g., "neutral", "happy", "sad"
    style?: string; // e.g., "conversational", "formal"
  };
}

/**
 * Speaker-to-voice mapping for multi-speaker content
 */
export interface SpeakerVoiceMapping {
  [speakerId: string]: VoiceConfig;
}

/**
 * Audio segment output from TTS
 */
export interface AudioSegment {
  segmentId: number;
  audioData: Buffer; // WAV format audio bytes
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
}

/**
 * TTS processing result
 */
export interface TTSResult {
  audioData: Buffer; // Complete audio file in WAV format
  segments: AudioSegment[];
  metadata: AdapterMetadata;
}

/**
 * Lip-sync processing result
 */
export interface LipSyncResult {
  videoPath: string; // Path to synced video file
  metadata: AdapterMetadata;
}

/**
 * Abstract base class for Speech-to-Text adapters
 *
 * Implementations: WhisperPyannoteAdapter
 */
export abstract class STTAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Transcribe audio file with speaker diarization
   *
   * @param audioPath - Path to audio file (WAV, MP3, etc.)
   * @param language - Source language ISO 639-1 code (e.g., "en", "es")
   * @returns Transcript with speaker labels and timestamps
   */
  abstract transcribe(audioPath: string, language: string): Promise<STTResult>;

  /**
   * Health check for the STT model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Abstract base class for Machine Translation adapters
 *
 * Implementations: MarianMTAdapter, LlamaMTAdapter
 */
export abstract class MTAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Translate text from source to target language
   *
   * @param text - Text to translate
   * @param sourceLanguage - Source language ISO 639-1 code
   * @param targetLanguage - Target language ISO 639-1 code
   * @param glossary - Optional custom term translations
   * @returns Translated text
   */
  abstract translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Record<string, string>
  ): Promise<string>;

  /**
   * Translate transcript segments while preserving timing and speaker info
   *
   * @param segments - Transcript segments to translate
   * @param sourceLanguage - Source language ISO 639-1 code
   * @param targetLanguage - Target language ISO 639-1 code
   * @param glossary - Optional custom term translations
   * @returns Translation with preserved metadata
   */
  abstract translateSegments(
    segments: TranscriptSegment[],
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Record<string, string>
  ): Promise<MTResult>;

  /**
   * Health check for the MT model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Abstract base class for Text-to-Speech adapters
 *
 * Implementations: StyleTTSAdapter, XTTSAdapter
 */
export abstract class TTSAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Synthesize speech from text with specified voice
   *
   * @param text - Text to synthesize
   * @param voiceConfig - Voice configuration
   * @param timestamps - Optional timing constraints for segments
   * @returns Audio data in WAV format
   */
  abstract synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    timestamps?: { start: number; end: number }
  ): Promise<Buffer>;

  /**
   * Synthesize speech for multiple segments with speaker-specific voices
   *
   * @param segments - Translation segments to synthesize
   * @param speakerVoiceMapping - Mapping of speakers to voice configs
   * @returns Complete audio with all segments
   */
  abstract synthesizeSegments(
    segments: TranslationSegment[],
    speakerVoiceMapping: SpeakerVoiceMapping
  ): Promise<TTSResult>;

  /**
   * Create a voice clone from audio sample
   *
   * @param audioPath - Path to audio sample (min 6 seconds)
   * @param voiceName - Name for the voice clone
   * @returns Voice clone ID for future use
   */
  abstract createVoiceClone(audioPath: string, voiceName: string): Promise<string>;

  /**
   * Health check for the TTS model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Abstract base class for Lip-Sync adapters
 *
 * Implementations: Wav2LipAdapter
 */
export abstract class LipSyncAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Synchronize lip movements with new audio
   *
   * @param videoPath - Path to input video file
   * @param audioPath - Path to new audio file
   * @param outputPath - Path for output video
   * @param enhanceFaces - Whether to apply face restoration (GFPGAN)
   * @returns Path to synced video
   */
  abstract sync(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    enhanceFaces?: boolean
  ): Promise<LipSyncResult>;

  /**
   * Health check for the lip-sync model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Vocal isolation processing result
 */
export interface VocalIsolationResult {
  vocalsPath: string; // Path to isolated vocals file
  metadata: AdapterMetadata;
}

/**
 * Abstract base class for Vocal Isolation adapters
 *
 * Implementations: DemucsAdapter
 */
export abstract class VocalIsolationAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Separate vocals from background music and effects
   *
   * @param audioPath - Path to audio file with mixed content
   * @param outputPath - Path for isolated vocals output
   * @returns Path to isolated vocals file
   */
  abstract separateVocals(audioPath: string, outputPath: string): Promise<VocalIsolationResult>;

  /**
   * Health check for the vocal isolation model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Emotion taxonomy for speech emotion recognition
 */
export enum EmotionTag {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  EXCITED = 'excited',
  FEARFUL = 'fearful',
  DISGUSTED = 'disgusted',
  SURPRISED = 'surprised',
}

/**
 * Emotion analysis result for a single audio segment
 */
export interface EmotionAnalysisResult {
  emotion: EmotionTag;
  confidence: number; // 0-1 scale
  scores: Record<EmotionTag, number>; // Probability distribution across all emotions
  metadata: AdapterMetadata;
}

/**
 * Abstract base class for Emotion Analysis adapters
 *
 * Implementations: Wav2Vec2EmotionAdapter
 */
export abstract class EmotionAnalysisAdapter {
  abstract name: string;
  abstract version: string;

  /**
   * Analyze emotion in audio segment
   *
   * @param audioPath - Path to audio file (clean vocals recommended)
   * @returns Detected emotion with confidence scores
   */
  abstract analyzeEmotion(audioPath: string): Promise<EmotionAnalysisResult>;

  /**
   * Analyze emotions for multiple audio segments in batch
   *
   * @param audioPaths - Array of audio file paths
   * @returns Array of emotion analysis results
   */
  abstract analyzeEmotionBatch(audioPaths: string[]): Promise<EmotionAnalysisResult[]>;

  /**
   * Health check for the emotion analysis model
   *
   * @returns Health status and latency
   */
  abstract healthCheck(): Promise<HealthCheckResult>;
}
