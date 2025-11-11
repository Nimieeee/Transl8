import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface FewShotExample {
  source: string;
  target: string;
  duration: number;
  emotion: string;
  source_char_count: number;
  target_char_count: number;
}

export interface FewShotExamples {
  [languagePair: string]: FewShotExample[];
}

export class FewShotLoader {
  private examples: FewShotExamples | null = null;
  private examplesPath: string;

  constructor(examplesPath?: string) {
    this.examplesPath = examplesPath || path.join(__dirname, 'few-shot-examples.json');
  }

  /**
   * Load few-shot examples from JSON file
   */
  load(): FewShotExamples {
    if (this.examples) {
      return this.examples;
    }

    try {
      const fileContent = fs.readFileSync(this.examplesPath, 'utf-8');
      this.examples = JSON.parse(fileContent);

      // Validate structure
      this.validate(this.examples!);

      logger.info(`Loaded few-shot examples from ${this.examplesPath}`);
      return this.examples!;
    } catch (error) {
      logger.error(`Failed to load few-shot examples: ${error}`);
      throw new Error(`Failed to load few-shot examples: ${error}`);
    }
  }

  /**
   * Get examples for a specific language pair
   */
  getExamples(sourceLanguage: string, targetLanguage: string): FewShotExample[] {
    if (!this.examples) {
      this.load();
    }

    const languagePair = `${sourceLanguage}-${targetLanguage}`;
    const examples = this.examples![languagePair];

    if (!examples || examples.length === 0) {
      logger.warn(`No few-shot examples found for language pair: ${languagePair}`);
      return [];
    }

    return examples;
  }

  /**
   * Validate few-shot examples structure
   */
  private validate(examples: FewShotExamples): void {
    const requiredFields = [
      'source',
      'target',
      'duration',
      'emotion',
      'source_char_count',
      'target_char_count',
    ];

    for (const [languagePair, exampleList] of Object.entries(examples)) {
      if (!Array.isArray(exampleList)) {
        throw new Error(`Examples for ${languagePair} must be an array`);
      }

      if (exampleList.length < 3) {
        throw new Error(
          `Language pair ${languagePair} must have at least 3 examples, found ${exampleList.length}`
        );
      }

      for (const example of exampleList) {
        for (const field of requiredFields) {
          if (!(field in example)) {
            throw new Error(`Example missing required field: ${field}`);
          }
        }

        // Validate types
        if (typeof example.source !== 'string' || typeof example.target !== 'string') {
          throw new Error('Source and target must be strings');
        }

        if (typeof example.duration !== 'number' || example.duration <= 0) {
          throw new Error('Duration must be a positive number');
        }

        if (typeof example.emotion !== 'string') {
          throw new Error('Emotion must be a string');
        }

        if (
          typeof example.source_char_count !== 'number' ||
          typeof example.target_char_count !== 'number'
        ) {
          throw new Error('Character counts must be numbers');
        }
      }
    }

    logger.info('Few-shot examples validation passed');
  }

  /**
   * Get all supported language pairs
   */
  getSupportedLanguagePairs(): string[] {
    if (!this.examples) {
      this.load();
    }

    return Object.keys(this.examples!);
  }

  /**
   * Check if a language pair is supported
   */
  isLanguagePairSupported(sourceLanguage: string, targetLanguage: string): boolean {
    const languagePair = `${sourceLanguage}-${targetLanguage}`;
    return this.getSupportedLanguagePairs().includes(languagePair);
  }
}

// Singleton instance
export const fewShotLoader = new FewShotLoader();
