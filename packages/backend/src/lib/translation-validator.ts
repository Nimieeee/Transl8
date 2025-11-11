/**
 * Translation Validator
 * 
 * Validates translations using heuristic checks and LLM-as-Judge.
 */

import { logger } from './logger';
import { MistralClient } from './mistral-client';
import { AdaptationEngine, ValidationResult } from './adaptation-engine';

export interface ValidationOptions {
  useHeuristicOnly?: boolean;
  useLLMJudge?: boolean;
}

export class TranslationValidator {
  private mistralClient: MistralClient;
  private adaptationEngine: AdaptationEngine;

  constructor(mistralClient: MistralClient, adaptationEngine: AdaptationEngine) {
    this.mistralClient = mistralClient;
    this.adaptationEngine = adaptationEngine;
  }

  /**
   * Validate translation with both heuristic and LLM-as-Judge
   */
  async validate(
    originalText: string,
    translatedText: string,
    duration: number,
    targetLanguage: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const useHeuristic = options.useHeuristicOnly !== false;
    const useLLMJudge = options.useLLMJudge !== false && !options.useHeuristicOnly;

    // Step 1: Heuristic validation (fast, cheap)
    if (useHeuristic) {
      const heuristicResult = this.adaptationEngine.validateHeuristic(
        originalText,
        translatedText,
        duration
      );

      if (!heuristicResult.isValid) {
        logger.debug(`Heuristic validation failed: ${heuristicResult.feedback}`);
        return heuristicResult;
      }

      logger.debug('Heuristic validation passed');

      // If heuristic-only mode, return success
      if (!useLLMJudge) {
        return heuristicResult;
      }
    }

    // Step 2: LLM-as-Judge validation (slower, more accurate)
    if (useLLMJudge) {
      try {
        const llmResult = await this.validateWithLLM(
          originalText,
          translatedText,
          duration,
          targetLanguage
        );

        return llmResult;
      } catch (error) {
        logger.error('LLM validation failed, falling back to heuristic result:', error);

        // If LLM fails, fall back to heuristic result
        if (useHeuristic) {
          return {
            isValid: true,
            feedback: 'passed heuristic validation (LLM validation failed)',
          };
        }

        throw error;
      }
    }

    // Default: passed
    return {
      isValid: true,
      feedback: 'passed validation',
    };
  }

  /**
   * Validate using LLM-as-Judge
   */
  private async validateWithLLM(
    originalText: string,
    translatedText: string,
    duration: number,
    targetLanguage: string
  ): Promise<ValidationResult> {
    const prompt = this.adaptationEngine.buildValidationPrompt(
      originalText,
      translatedText,
      duration,
      targetLanguage
    );

    logger.debug('Running LLM-as-Judge validation');

    const response = await this.mistralClient.validate(prompt);

    // Parse response
    const isValid = this.parseValidationResponse(response);

    if (isValid) {
      logger.debug('LLM-as-Judge validation passed');
      return {
        isValid: true,
        feedback: 'passed LLM-as-Judge validation',
      };
    } else {
      logger.debug('LLM-as-Judge validation failed');
      return {
        isValid: false,
        feedback: 'failed natural speech test (LLM-as-Judge)',
      };
    }
  }

  /**
   * Parse LLM validation response
   */
  private parseValidationResponse(response: string): boolean {
    const normalized = response.toUpperCase().trim();

    // Check for YES
    if (normalized.includes('YES')) {
      return true;
    }

    // Check for NO
    if (normalized.includes('NO')) {
      return false;
    }

    // If unclear, log warning and default to false (conservative)
    logger.warn(`Unclear LLM validation response: "${response}". Defaulting to NO.`);
    return false;
  }

  /**
   * Validate multiple translations in batch
   */
  async validateBatch(
    validations: Array<{
      originalText: string;
      translatedText: string;
      duration: number;
      targetLanguage: string;
    }>,
    options: ValidationOptions = {}
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validation of validations) {
      const result = await this.validate(
        validation.originalText,
        validation.translatedText,
        validation.duration,
        validation.targetLanguage,
        options
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Get validation statistics
   */
  getValidationStats(results: ValidationResult[]): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  } {
    const total = results.length;
    const passed = results.filter(r => r.isValid).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      passRate,
    };
  }
}
