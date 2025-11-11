/**
 * TTS-Validated Adaptation Service
 *
 * The ultimate solution: Don't trust the LLM - verify with actual TTS!
 *
 * This service implements a validation loop that:
 * 1. Gets adapted text from LLM
 * 2. Generates test audio with TTS
 * 3. Measures actual duration
 * 4. Validates against target (±15% tolerance)
 * 5. Retries with specific feedback if failed
 * 6. Returns validated text + audio
 */

import { logger } from './logger';
import { AdaptationEngine, AdaptationConfig } from './adaptation-engine';
import { MistralClient, getMistralClient } from './mistral-client';
import { ContextMapSegment } from '../../../shared/src/types';
import { TTSAdapter, VoiceConfig } from '../adapters/types';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TTSValidatedResult {
  adaptedText: string;
  audioPath: string;
  actualDuration: number;
  targetDuration: number;
  attempts: number;
  status: 'success' | 'failed';
  validationHistory: ValidationAttempt[];
}

interface ValidationAttempt {
  attempt: number;
  text: string;
  audioPath: string;
  actualDuration: number;
  targetDuration: number;
  tolerance: number;
  withinTolerance: boolean;
  feedback: string;
}

export interface TTSValidationConfig {
  maxAttempts: number;
  tolerancePercent: number; // e.g., 15 for ±15%
  minDuration: number; // Minimum acceptable duration (seconds)
  maxDuration: number; // Maximum acceptable duration (seconds)
  shortSegmentThreshold: number; // Threshold for "short" segments (seconds)
  shortSegmentTolerance: number; // Higher tolerance for short segments
}

export class TTSValidatedAdaptationService {
  private adaptationEngine: AdaptationEngine;
  private mistralClient: MistralClient;
  private ttsAdapter: TTSAdapter;
  private config: TTSValidationConfig;

  constructor(
    adaptationConfig: AdaptationConfig,
    ttsAdapter: TTSAdapter,
    validationConfig?: Partial<TTSValidationConfig>
  ) {
    this.adaptationEngine = new AdaptationEngine(adaptationConfig);
    this.mistralClient = getMistralClient();
    this.ttsAdapter = ttsAdapter;

    this.config = {
      maxAttempts: validationConfig?.maxAttempts || 10,
      tolerancePercent: validationConfig?.tolerancePercent || 15, // Tighter tolerance: ±15%
      minDuration: validationConfig?.minDuration || 0.3,
      maxDuration: validationConfig?.maxDuration || 30.0,
      shortSegmentThreshold: validationConfig?.shortSegmentThreshold || 1.0,
      shortSegmentTolerance: validationConfig?.shortSegmentTolerance || 30, // Tighter for short segments too
    };
  }

  /**
   * Adapt segment with TTS validation loop
   */
  async adaptSegmentWithTTSValidation(
    segment: ContextMapSegment,
    voiceConfig: VoiceConfig,
    targetLanguage: string
  ): Promise<TTSValidatedResult> {
    // Check if segment is too short for meaningful adaptation
    if (segment.duration < 0.3) {
      logger.warn(`   ⚠️  Segment ${segment.id} is extremely short (${segment.duration}s)`);
      logger.warn(`   Using simple translation without TTS validation`);

      // For extremely short segments, just do a simple translation
      const simpleTranslation = await this.generateSimpleTranslation(segment, targetLanguage);

      return {
        adaptedText: simpleTranslation,
        audioPath: '', // No validated audio for ultra-short segments
        actualDuration: segment.duration, // Assume it matches
        targetDuration: segment.duration,
        attempts: 1,
        status: 'success',
        validationHistory: [],
      };
    }

    // Determine if this is a short segment and adjust tolerance
    const isShortSegment = segment.duration < this.config.shortSegmentThreshold;
    const effectiveTolerance = isShortSegment
      ? this.config.shortSegmentTolerance
      : this.config.tolerancePercent;

    // Use tolerance for validation
    const _tolerance = effectiveTolerance;

    logger.info(`🔄 Starting TTS-validated adaptation for segment ${segment.id}`);
    logger.info(`   Target duration: ${segment.duration}s (±${effectiveTolerance}%)`);
    if (isShortSegment) {
      logger.info(`   ⚡ Short segment detected - using higher tolerance (${effectiveTolerance}%)`);
    }

    const validationHistory: ValidationAttempt[] = [];
    let previousFeedback: string | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      logger.info(`\n📝 Attempt ${attempt}/${this.config.maxAttempts}`);

      try {
        // Step 1: Get adapted text from LLM with character-per-second guidance
        const adaptedText = await this.generateAdaptedText(
          segment,
          attempt,
          previousFeedback,
          targetLanguage,
          effectiveTolerance
        );

        logger.info(`   Generated text: "${adaptedText}"`);

        // Step 2: Generate test audio with TTS
        const testAudioPath = await this.generateTestAudio(
          adaptedText,
          voiceConfig,
          targetLanguage,
          segment.id,
          attempt
        );

        // Step 3: Measure actual duration
        const actualDuration = await this.getAudioDuration(testAudioPath);
        logger.info(`   Actual duration: ${actualDuration.toFixed(2)}s`);

        // Step 4: Validate against target (use effective tolerance)
        const validation = this.validateDuration(
          actualDuration,
          segment.duration,
          effectiveTolerance
        );

        // Record this attempt
        const attemptRecord: ValidationAttempt = {
          attempt,
          text: adaptedText,
          audioPath: testAudioPath,
          actualDuration,
          targetDuration: segment.duration,
          tolerance: effectiveTolerance,
          withinTolerance: validation.isValid,
          feedback: validation.feedback,
        };
        validationHistory.push(attemptRecord);

        if (validation.isValid) {
          // SUCCESS! Duration is within tolerance
          logger.info(`   ✅ VALIDATION PASSED: ${validation.feedback}`);
          logger.info(`   Committing this text and audio`);

          return {
            adaptedText,
            audioPath: testAudioPath,
            actualDuration,
            targetDuration: segment.duration,
            attempts: attempt,
            status: 'success',
            validationHistory,
          };
        }

        // FAILED validation
        logger.warn(`   ❌ VALIDATION FAILED: ${validation.feedback}`);

        if (attempt < this.config.maxAttempts) {
          // Prepare feedback for next attempt (pass attempt number for escalating feedback)
          previousFeedback = this.buildRetryFeedback(
            adaptedText,
            actualDuration,
            segment.duration,
            validation,
            attempt
          );

          logger.info(`   🔄 Retrying with feedback...`);

          // Clean up failed test audio
          this.cleanupTestAudio(testAudioPath);
        } else {
          // Max attempts reached
          logger.error(`   ❌ Max attempts (${this.config.maxAttempts}) reached`);

          // Return best attempt (closest to target)
          const bestAttempt = this.findBestAttempt(validationHistory);
          logger.info(
            `   📊 Using best attempt: #${bestAttempt.attempt} (${bestAttempt.actualDuration.toFixed(2)}s)`
          );

          return {
            adaptedText: bestAttempt.text,
            audioPath: bestAttempt.audioPath,
            actualDuration: bestAttempt.actualDuration,
            targetDuration: segment.duration,
            attempts: this.config.maxAttempts,
            status: 'failed',
            validationHistory,
          };
        }
      } catch (error) {
        logger.error(`   ❌ Error in attempt ${attempt}:`, error);

        if (attempt === this.config.maxAttempts) {
          throw error;
        }

        previousFeedback = `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('Unexpected end of validation loop');
  }

  /**
   * Generate adapted text from LLM with character-per-second guidance
   */
  private async generateAdaptedText(
    segment: ContextMapSegment,
    attempt: number,
    previousFeedback: string | undefined,
    _targetLanguage: string,
    tolerance: number
  ): Promise<string> {
    // Calculate character-per-second heuristics
    const sourceChars = segment.text.length;
    const _sourceCharsPerSecond = sourceChars / segment.duration;
    const _tolerance = tolerance;

    // Language-specific character expansion/contraction factors
    const expansionFactors: Record<string, number> = {
      es: 1.15, // Spanish tends to be ~15% longer
      fr: 1.2, // French tends to be ~20% longer
      pt: 1.15, // Portuguese similar to Spanish
      de: 1.1, // German slightly longer
      it: 1.15, // Italian similar to Spanish
      ja: 0.7, // Japanese much shorter (uses fewer characters)
      ko: 0.75, // Korean shorter
      zh: 0.6, // Chinese very compact
      ar: 1.05, // Arabic slightly longer
      ru: 1.1, // Russian slightly longer
    };

    const expansionFactor = expansionFactors[_targetLanguage] || 1.0;
    const targetChars = Math.round(sourceChars * expansionFactor);
    const targetCharsPerSecond = targetChars / segment.duration;

    // Add character guidance to the prompt
    let enhancedFeedback = previousFeedback || '';

    if (attempt === 1) {
      // First attempt: provide character guidance
      enhancedFeedback = `CHARACTER GUIDANCE:\n`;
      enhancedFeedback += `• Source text: ${sourceChars} characters in ${segment.duration.toFixed(1)}s\n`;
      enhancedFeedback += `• Target should be approximately ${targetChars} characters\n`;
      enhancedFeedback += `• Aim for ${targetCharsPerSecond.toFixed(1)} characters per second\n\n`;

      // Special guidance for very short segments
      if (segment.duration < 1.0) {
        enhancedFeedback += `⚡ VERY SHORT SEGMENT (${segment.duration.toFixed(1)}s):\n`;
        enhancedFeedback += `• Use the SHORTEST possible translation\n`;
        enhancedFeedback += `• Single words or very brief phrases only\n`;
        enhancedFeedback += `• Avoid filler words completely\n`;
        enhancedFeedback += `• Examples: "Stay tuned" → "Espera" (not "Quédense atentos")\n\n`;
      }
    }

    const prompt = this.adaptationEngine.buildPrompt(segment, attempt - 1, enhancedFeedback);
    const translation = await this.mistralClient.translate(prompt);

    if (!translation) {
      throw new Error('Empty translation received from LLM');
    }

    return this.adaptationEngine.applyGlossary(translation);
  }

  /**
   * Generate test audio with TTS
   */
  private async generateTestAudio(
    text: string,
    voiceConfig: VoiceConfig,
    targetLanguage: string,
    segmentId: number,
    attempt: number
  ): Promise<string> {
    logger.debug(`   🎤 Generating test audio...`);

    // Extract voice from config (OpenAI TTS expects just the voice name)
    const voiceId = voiceConfig.voiceId || 'alloy';
    // Synthesize with OpenAI TTS
    const audioBuffer = await this.ttsAdapter.synthesize(text, voiceConfig);

    // Save to temp file
    const outputDir = path.join(process.cwd(), 'temp', 'tts-validation');
    await fs.promises.mkdir(outputDir, { recursive: true });

    const testPath = path.join(outputDir, `segment_${segmentId}_test_attempt${attempt}.wav`);
    await fs.promises.writeFile(testPath, audioBuffer);

    return testPath;
  }

  /**
   * Get actual duration of audio file
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      // Use ffprobe to get exact duration
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );

      const duration = parseFloat(stdout.trim());

      if (isNaN(duration)) {
        throw new Error(`Invalid duration from ffprobe: ${stdout}`);
      }

      return duration;
    } catch (error) {
      logger.error(`Failed to get audio duration:`, error);
      throw error;
    }
  }

  /**
   * Validate duration against target with tolerance
   */
  private validateDuration(
    actualDuration: number,
    targetDuration: number,
    tolerancePercent: number
  ): { isValid: boolean; feedback: string; difference: number; percentDiff: number } {
    const tolerance = targetDuration * (tolerancePercent / 100);
    const minAcceptable = targetDuration - tolerance;
    const maxAcceptable = targetDuration + tolerance;
    const difference = actualDuration - targetDuration;
    const percentDiff = (difference / targetDuration) * 100;

    const isValid = actualDuration >= minAcceptable && actualDuration <= maxAcceptable;

    let feedback: string;
    if (isValid) {
      feedback = `Within tolerance (${actualDuration.toFixed(2)}s vs ${targetDuration.toFixed(2)}s, ${percentDiff.toFixed(1)}% diff)`;
    } else if (actualDuration < minAcceptable) {
      feedback = `Too short (${actualDuration.toFixed(2)}s vs ${targetDuration.toFixed(2)}s, ${percentDiff.toFixed(1)}% diff)`;
    } else {
      feedback = `Too long (${actualDuration.toFixed(2)}s vs ${targetDuration.toFixed(2)}s, ${percentDiff.toFixed(1)}% diff)`;
    }

    return { isValid, feedback, difference, percentDiff };
  }

  /**
   * Build specific feedback for retry
   */
  private buildRetryFeedback(
    previousText: string,
    actualDuration: number,
    targetDuration: number,
    validation: { difference: number; percentDiff: number },
    attempt: number = 1
  ): string {
    const isTooShort = actualDuration < targetDuration;
    const _isTooLong = actualDuration > targetDuration;
    const isVeryOff = Math.abs(validation.percentDiff) > 30;

    let feedback = `Your previous adaptation was ${isTooShort ? 'TOO SHORT' : 'TOO LONG'}.\n\n`;
    feedback += `TARGET TIME: ${targetDuration.toFixed(2)} seconds\n`;
    feedback += `PREVIOUS TEXT: "${previousText}"\n`;
    feedback += `ACTUAL SPOKEN TIME: ${actualDuration.toFixed(2)} seconds\n`;
    feedback += `DIFFERENCE: ${Math.abs(validation.difference).toFixed(2)}s (${Math.abs(validation.percentDiff).toFixed(1)}%)\n\n`;

    // Get more aggressive with feedback after multiple attempts
    if (attempt >= 5 && isVeryOff) {
      feedback += `⚠️  CRITICAL: This is attempt ${attempt}. You are STILL very far off target!\n`;
      feedback += `You MUST make DRASTIC changes to the text length.\n\n`;
    } else {
      feedback += `This is a FAIL. `;
    }

    if (isTooShort) {
      feedback += `You MUST generate a LONGER adaptation.\n\n`;

      if (attempt >= 5) {
        feedback += `AGGRESSIVE STRATEGIES (you need to add much more):\n`;
        feedback += `• Add multiple filler phrases and natural hesitations\n`;
        feedback += `• Expand every idea with additional context\n`;
        feedback += `• Use longer, more descriptive alternatives\n`;
        feedback += `• Add conversational elements like "you know", "I mean", etc.\n`;
        feedback += `• Repeat key points in different words\n`;
      } else {
        feedback += `Strategies to make it longer:\n`;
        feedback += `• Add natural filler words ("bueno", "la verdad es que", "pues")\n`;
        feedback += `• Use more descriptive phrases\n`;
        feedback += `• Add reflective pauses or hesitations\n`;
        feedback += `• Rephrase to be more verbose while staying natural\n`;
        feedback += `• Example: "No sé" → "Bueno, la verdad es que no estoy muy seguro"\n`;
      }
    } else {
      feedback += `You MUST generate a SHORTER adaptation.\n\n`;

      if (attempt >= 5) {
        feedback += `AGGRESSIVE STRATEGIES (you need to cut much more):\n`;
        feedback += `• Remove ALL filler words and unnecessary phrases\n`;
        feedback += `• Use the shortest possible words and phrases\n`;
        feedback += `• Cut any redundant information\n`;
        feedback += `• Use abbreviations or contractions where natural\n`;
        feedback += `• Aim for MAXIMUM brevity while keeping meaning\n`;
        feedback += `• Example: "We will be translating from English to Spanish to French" → "Translating: English, Spanish, French"\n`;
      } else {
        feedback += `Strategies to make it shorter:\n`;
        feedback += `• Remove filler words\n`;
        feedback += `• Use more concise phrasing\n`;
        feedback += `• Simplify complex sentences\n`;
        feedback += `• Use shorter synonyms\n`;
        feedback += `• Example: "Bueno, la verdad es que no sé" → "No sé"\n`;
      }
    }

    feedback += `\nYou must fill the ENTIRE ${targetDuration.toFixed(2)}-second target naturally.`;

    return feedback;
  }

  /**
   * Find best attempt (closest to target duration)
   */
  private findBestAttempt(history: ValidationAttempt[]): ValidationAttempt {
    return history.reduce((best, current) => {
      const bestDiff = Math.abs(best.actualDuration - best.targetDuration);
      const currentDiff = Math.abs(current.actualDuration - current.targetDuration);
      return currentDiff < bestDiff ? current : best;
    });
  }

  /**
   * Generate simple translation for extremely short segments
   */
  private async generateSimpleTranslation(
    segment: ContextMapSegment,
    targetLanguage: string
  ): Promise<string> {
    // For ultra-short segments, use the shortest possible translation
    const shortTranslations: Record<string, Record<string, string>> = {
      es: {
        'stay tuned': 'Espera',
        wait: 'Espera',
        yes: 'Sí',
        no: 'No',
        ok: 'Vale',
        thanks: 'Gracias',
        bye: 'Adiós',
      },
      fr: {
        'stay tuned': 'Attends',
        wait: 'Attends',
        yes: 'Oui',
        no: 'Non',
        ok: 'Ok',
        thanks: 'Merci',
        bye: 'Salut',
      },
    };

    const textLower = segment.text.toLowerCase().trim();
    const translations = shortTranslations[targetLanguage];

    if (translations && translations[textLower]) {
      return translations[textLower];
    }

    // Fallback: use LLM but ask for shortest possible
    const prompt = `Translate to ${targetLanguage}. Use the SHORTEST possible translation (1-2 words max): "${segment.text}"`;
    const translation = await this.mistralClient.translate(prompt);

    return translation || segment.text;
  }

  /**
   * Clean up test audio file
   */
  private cleanupTestAudio(audioPath: string): void {
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        logger.debug(`   🗑️  Cleaned up test audio: ${audioPath}`);
      }
    } catch (error) {
      logger.warn(`   ⚠️  Failed to cleanup test audio:`, error);
    }
  }

  /**
   * Generate summary report
   */
  generateValidationReport(results: TTSValidatedResult[]): string {
    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
    const avgAttempts = totalAttempts / results.length;

    let report = '═══════════════════════════════════════════════════\n';
    report += 'TTS-VALIDATED ADAPTATION SUMMARY\n';
    report += '═══════════════════════════════════════════════════\n\n';
    report += `Total segments: ${results.length}\n`;
    report += `Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)\n`;
    report += `Failed: ${failed}\n`;
    report += `Average attempts: ${avgAttempts.toFixed(2)}\n`;
    report += `Total TTS calls: ${totalAttempts}\n\n`;

    if (failed > 0) {
      report += 'Failed segments:\n';
      results
        .filter((r) => r.status === 'failed')
        .forEach((result, index) => {
          const bestAttempt = this.findBestAttempt(result.validationHistory);
          report += `  ${index + 1}. Target: ${result.targetDuration.toFixed(2)}s, `;
          report += `Best: ${bestAttempt.actualDuration.toFixed(2)}s `;
          report += `(${Math.abs(bestAttempt.actualDuration - result.targetDuration).toFixed(2)}s off)\n`;
        });
    }

    return report;
  }
}
