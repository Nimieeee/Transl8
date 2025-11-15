/**
 * Adaptation Engine
 *
 * Intelligent translation adaptation system that uses LLMs with few-shot examples
 * and validation loops to generate timing-aware translations.
 */

import { logger } from './logger';
import { fewShotLoader, FewShotExample } from './few-shot-loader';
import { ContextMapSegment } from '../../../shared/src/types';

export interface AdaptationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  maxRetries: number;
  glossary?: Record<string, string>;
}

export interface AdaptationResult {
  adaptedText: string;
  status: 'success' | 'failed_adaptation';
  attempts: number;
  validationFeedback?: string;
}

export interface ValidationResult {
  isValid: boolean;
  feedback: string;
}

export class AdaptationEngine {
  private config: AdaptationConfig;
  private fewShotExamples: FewShotExample[];

  constructor(config: AdaptationConfig) {
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? 2,
    };

    // Load few-shot examples for this language pair
    this.fewShotExamples = fewShotLoader.getExamples(config.sourceLanguage, config.targetLanguage);

    if (this.fewShotExamples.length === 0) {
      logger.warn(
        `No few-shot examples found for ${config.sourceLanguage}-${config.targetLanguage}`
      );
    }
  }

  /**
   * Build dynamic prompt with few-shot examples and context
   */
  buildPrompt(segment: ContextMapSegment, _attempt: number = 0, previousFeedback?: string): string {
    const targetLangName = this.getLanguageName(this.config.targetLanguage);

    // ============================================================
    // SYSTEM PROMPT: Define the core mission
    // ============================================================
    let prompt = `You are an expert dubbing adaptation specialist. Your job is NOT to translate word-for-word, but to CREATE A NEW SCRIPT that:

1. FITS THE EXACT TIME CONSTRAINT (${segment.duration.toFixed(1)} seconds)
2. Preserves the core meaning and emotional intent
3. Sounds natural when spoken aloud in ${targetLangName}

THIS IS DUBBING, NOT TRANSLATION. Think like a screenwriter adapting dialogue for actors, not a translator converting documents.

KEY PRINCIPLE: If the original text cannot fit in the time available, you MUST adapt it to be shorter while keeping the essence. This is your PRIMARY responsibility.

`;

    // ============================================================
    // FEW-SHOT EXAMPLES: Show what success looks like
    // ============================================================
    if (this.fewShotExamples.length > 0) {
      prompt += '═══════════════════════════════════════════════════\n';
      prompt += 'EXAMPLES OF EXCELLENT TIMING-AWARE ADAPTATIONS:\n';
      prompt += '═══════════════════════════════════════════════════\n\n';

      for (const example of this.fewShotExamples) {
        prompt += `⏱️  ${example.duration}s | 😊 ${example.emotion}\n`;
        prompt += `   Original: "${example.source}"\n`;
        prompt += `   Adapted:  "${example.target}"\n`;
        prompt += `   ✓ Notice: Concise, natural, fits the time\n\n`;
      }
    }

    // ============================================================
    // TIMING GUIDELINES: Be explicit about constraints
    // ============================================================
    prompt += '═══════════════════════════════════════════════════\n';
    prompt += 'TIMING GUIDELINES (CRITICAL):\n';
    prompt += '═══════════════════════════════════════════════════\n\n';

    // Provide specific guidance based on segment duration
    if (segment.duration < 1.0) {
      prompt += `⚠️  VERY SHORT SEGMENT (${segment.duration.toFixed(1)}s)\n`;
      prompt += `   → Use 1-2 words MAXIMUM\n`;
      prompt += `   → Single exclamations or commands work best\n`;
      prompt += `   → Example: "Get out!" → "¡Fuera!" (NOT "¡Sal de aquí ahora mismo!")\n\n`;
    } else if (segment.duration < 2.0) {
      prompt += `⚠️  SHORT SEGMENT (${segment.duration.toFixed(1)}s)\n`;
      prompt += `   → Use 3-5 words maximum\n`;
      prompt += `   → Keep phrases brief and punchy\n`;
      prompt += `   → Avoid complex sentence structures\n\n`;
    } else if (segment.duration < 4.0) {
      prompt += `📏 MEDIUM SEGMENT (${segment.duration.toFixed(1)}s)\n`;
      prompt += `   → Use 6-10 words typically\n`;
      prompt += `   → One complete thought or sentence\n`;
      prompt += `   → Natural conversational pace (2-3 words/second)\n\n`;
    } else {
      prompt += `📏 LONGER SEGMENT (${segment.duration.toFixed(1)}s)\n`;
      prompt += `   → Use 10-15 words typically\n`;
      prompt += `   → Can include 1-2 sentences\n`;
      prompt += `   → Maintain natural speech rhythm\n\n`;
    }

    // ============================================================
    // GLOSSARY: Custom terminology (if provided)
    // ============================================================
    if (this.config.glossary && Object.keys(this.config.glossary).length > 0) {
      prompt += '═══════════════════════════════════════════════════\n';
      prompt += 'REQUIRED TERMINOLOGY (use these exact translations):\n';
      prompt += '═══════════════════════════════════════════════════\n\n';
      for (const [source, target] of Object.entries(this.config.glossary)) {
        prompt += `   "${source}" → "${target}"\n`;
      }
      prompt += '\n';
    }

    // ============================================================
    // CONTEXT: The actual segment to adapt
    // ============================================================
    prompt += '═══════════════════════════════════════════════════\n';
    prompt += 'YOUR TASK:\n';
    prompt += '═══════════════════════════════════════════════════\n\n';

    if (segment.previous_line) {
      prompt += `[Context] Previous dialogue: "${segment.previous_line}"\n\n`;
    }

    prompt += `⏱️  TIME AVAILABLE: ${segment.duration.toFixed(1)} seconds\n`;
    if (segment.emotion) {
      prompt += `😊 EMOTION: ${segment.emotion}\n`;
    }
    prompt += `🎬 TRANSLATE THIS LINE (and ONLY this line): "${segment.text}"\n`;
    prompt += `🌍 TARGET LANGUAGE: ${targetLangName}\n\n`;

    if (segment.next_line) {
      prompt += `[Context] Next dialogue: "${segment.next_line}"\n\n`;
    }

    // ============================================================
    // RETRY FEEDBACK: Learn from previous attempts
    // ============================================================
    if (previousFeedback) {
      prompt += '═══════════════════════════════════════════════════\n';
      prompt += '⚠️  RETRY REQUIRED - YOUR PREVIOUS ATTEMPT FAILED:\n';
      prompt += '═══════════════════════════════════════════════════\n\n';

      prompt += `Problem: ${previousFeedback}\n\n`;

      if (previousFeedback.includes('too long') || previousFeedback.includes('too fast')) {
        prompt += `🔴 ACTION REQUIRED: Your translation was TOO LONG.\n\n`;
        prompt += `You MUST make it SIGNIFICANTLY SHORTER:\n`;
        prompt += `   • Cut unnecessary words\n`;
        prompt += `   • Use shorter synonyms\n`;
        prompt += `   • Simplify the sentence structure\n`;
        prompt += `   • Focus on the core message only\n\n`;

        if (segment.duration < 1.0) {
          prompt += `REMINDER: For ${segment.duration.toFixed(1)}s, you need 1-2 words MAX.\n`;
          prompt += `Think: "Stop!" not "Please stop doing that!"\n\n`;
        }
      } else if (previousFeedback.includes('too short')) {
        prompt += `🔴 ACTION REQUIRED: Your translation was TOO SHORT.\n\n`;
        prompt += `Add more natural detail while staying within ${segment.duration.toFixed(1)}s:\n`;
        prompt += `   • Use fuller expressions\n`;
        prompt += `   • Add natural filler words if appropriate\n`;
        prompt += `   • Expand abbreviations\n\n`;
      }
    }

    // ============================================================
    // FINAL INSTRUCTIONS: Clear output format
    // ============================================================
    prompt += '═══════════════════════════════════════════════════\n';
    prompt += 'OUTPUT INSTRUCTIONS:\n';
    prompt += '═══════════════════════════════════════════════════\n\n';

    prompt += `Create a ${targetLangName} adaptation that:\n`;
    prompt += `✓ Can be spoken naturally in ${segment.duration.toFixed(1)} seconds\n`;
    prompt += `✓ Preserves the core meaning\n`;
    prompt += `✓ IMPORTANT: Translate ONLY the line marked "TRANSLATE THIS LINE", not the context lines\n`;
    if (segment.emotion) {
      prompt += `✓ Maintains the ${segment.emotion} emotional tone\n`;
    }
    prompt += `✓ Sounds like natural ${targetLangName} dialogue\n\n`;

    prompt += `🎯 RESPOND WITH ONLY THE ADAPTED ${targetLangName} TEXT.\n`;
    prompt += `   NO explanations, NO notes, NO quotation marks.\n`;
    prompt += `   Just the dialogue that an actor would speak.\n`;

    return prompt;
  }

  /**
   * Build LLM-as-Judge validation prompt
   */
  buildValidationPrompt(
    originalText: string,
    translatedText: string,
    duration: number,
    targetLanguage: string
  ): string {
    const targetLangName = this.getLanguageName(targetLanguage);

    return `You are a speech timing expert. Evaluate if this ${targetLangName} text can be spoken naturally in ${duration.toFixed(1)} seconds.

Original: "${originalText}"
Translation: "${translatedText}"
Time limit: ${duration.toFixed(1)} seconds

Consider:
1. Natural speech pace (typically 2-3 words per second)
2. Pauses and breathing
3. Emotional delivery requirements

Answer with ONLY "YES" if it fits naturally, or "NO" if it's too long or too short.`;
  }

  /**
   * Validate translation using heuristic checks
   */
  validateHeuristic(
    originalText: string,
    translatedText: string,
    duration: number
  ): ValidationResult {
    const originalLength = originalText.length;
    const translatedLength = translatedText.length;
    const charRatio = translatedLength / originalLength;

    // Check character count ratio (allow 0.4x to 2.0x for natural language expansion)
    // Spanish/French typically expand 20-30% from English
    if (charRatio > 2.0) {
      return {
        isValid: false,
        feedback: 'too long (character count exceeds 200% of original)',
      };
    }

    if (charRatio < 0.4) {
      return {
        isValid: false,
        feedback: 'too short (character count below 40% of original)',
      };
    }

    // Estimate words per second (rough heuristic)
    const wordCount = translatedText.split(/\s+/).length;
    const wordsPerSecond = wordCount / duration;

    // More aggressive timing validation
    // Typical comfortable speech is 2-3 words per second
    // Allow up to 4 wps for fast speech, but flag anything above that
    if (wordsPerSecond > 4.5) {
      return {
        isValid: false,
        feedback: 'too long (would require speaking too fast - reduce word count)',
      };
    }

    // For very short segments (< 1 second), be extra strict
    if (duration < 1.0 && wordCount > 2) {
      return {
        isValid: false,
        feedback: `too long for ${duration.toFixed(1)}s segment (use 1-2 words maximum)`,
      };
    }

    // For short segments (1-2 seconds), limit to reasonable word count
    if (duration < 2.0 && wordCount > 5) {
      return {
        isValid: false,
        feedback: `too long for ${duration.toFixed(1)}s segment (use maximum 5 words)`,
      };
    }

    if (wordsPerSecond < 0.8 && duration > 2) {
      return {
        isValid: false,
        feedback: 'too short (would have awkward pauses)',
      };
    }

    return {
      isValid: true,
      feedback: 'passed heuristic validation',
    };
  }

  /**
   * Get language name for display
   */
  private getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      hi: 'Hindi',
      ru: 'Russian',
      nl: 'Dutch',
      pl: 'Polish',
      tr: 'Turkish',
      vi: 'Vietnamese',
      th: 'Thai',
      id: 'Indonesian',
    };

    return languageNames[code] || code.toUpperCase();
  }

  /**
   * Apply glossary terms to translation
   */
  applyGlossary(text: string): string {
    if (!this.config.glossary) {
      return text;
    }

    let result = text;
    for (const [source, target] of Object.entries(this.config.glossary)) {
      // Case-insensitive replacement
      const regex = new RegExp(source, 'gi');
      result = result.replace(regex, target);
    }

    return result;
  }

  /**
   * Get configuration
   */
  getConfig(): AdaptationConfig {
    return { ...this.config };
  }

  /**
   * Get few-shot examples
   */
  getFewShotExamples(): FewShotExample[] {
    return [...this.fewShotExamples];
  }
}
