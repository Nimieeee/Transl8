/**
 * Gemini API Client
 *
 * Wrapper for Google's Gemini API for translation and validation tasks.
 */

import { logger } from './logger';

export interface GeminiConfig {
  apiKey: string;
  model?:
    | 'gemini-2.5-pro'
    | 'gemini-2.0-flash-exp'
    | 'gemini-1.5-pro'
    | 'gemini-1.5-flash'
    | 'gemini-pro'
    | 'gemini-pro-latest'
    | 'gemini-flash-latest';
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'gemini-2.5-pro';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens || 8192; // Increased for translation tasks
  }

  /**
   * Generate text using Gemini API
   */
  async generate(
    prompt: string,
    options?: {
      model?:
        | 'gemini-2.5-pro'
        | 'gemini-2.0-flash-exp'
        | 'gemini-1.5-pro'
        | 'gemini-1.5-flash'
        | 'gemini-pro'
        | 'gemini-pro-latest'
        | 'gemini-flash-latest';
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<GeminiResponse> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;

    const startTime = Date.now();

    try {
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40,
        },
      };

      logger.debug(`Calling Gemini API with model: ${model}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Gemini API error: ${response.status} - ${errorText}`);

        // Handle rate limiting
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as any;

      // Extract text from response
      const text = this.extractText(data);

      const duration = Date.now() - startTime;
      logger.debug(`Gemini API call completed in ${duration}ms`);

      // Extract usage information if available
      const usage = data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      // Log interaction for debugging
      this.logInteraction(prompt, text, model, duration, usage);

      return {
        text,
        usage,
      };
    } catch (error) {
      logger.error('Gemini API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate translation using Gemini 2.5 Pro for highest quality adaptation
   */
  async translate(prompt: string): Promise<string> {
    const response = await this.generate(prompt, {
      model: 'gemini-2.5-pro',
      temperature: 0.7,
    });

    return response.text.trim();
  }

  /**
   * Validate translation using Gemini 2.5 Pro for consistent quality
   */
  async validate(prompt: string): Promise<string> {
    const response = await this.generate(prompt, {
      model: 'gemini-2.5-pro',
      temperature: 0.3, // Lower temperature for more deterministic validation
      maxTokens: 10, // We only need YES or NO
    });

    return response.text.trim();
  }

  /**
   * Extract text from Gemini API response
   */
  private extractText(data: any): string {
    try {
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];

        // Check finish reason for issues
        if (candidate.finishReason) {
          if (candidate.finishReason === 'SAFETY') {
            logger.error('Gemini response blocked by safety filters');
            logger.debug('Safety ratings:', JSON.stringify(candidate.safetyRatings));
          } else if (candidate.finishReason !== 'STOP') {
            logger.warn(`Gemini stopped with reason: ${candidate.finishReason}`);
          }
        }

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const text = candidate.content.parts[0].text || '';
          if (!text) {
            logger.warn('Empty text in response despite valid structure');
            logger.debug('Full candidate:', JSON.stringify(candidate));
          }
          return text;
        }
      }

      logger.warn('Unexpected Gemini API response structure');
      logger.debug('Full response:', JSON.stringify(data, null, 2));
      return '';
    } catch (error) {
      logger.error('Failed to extract text from Gemini response:', error);
      return '';
    }
  }

  /**
   * Log LLM interaction for debugging
   */
  private logInteraction(
    prompt: string,
    response: string,
    model: string,
    duration: number,
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      model,
      duration_ms: duration,
      prompt_length: prompt.length,
      response_length: response.length,
      usage,
      prompt_preview: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      response_preview: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
    };

    logger.debug('LLM Interaction:', logEntry);
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate('Say "Hello"', {
        model: 'gemini-2.5-pro',
        maxTokens: 100, // Increased to avoid MAX_TOKENS error
      });

      return response.text.length > 0;
    } catch (error) {
      logger.error('Gemini API connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create Gemini client from environment variables
 */
export function createGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-pro') as GeminiConfig['model'];

  return new GeminiClient({
    apiKey,
    model,
    temperature: 0.7,
    maxTokens: 1024,
  });
}

// Singleton instance (lazy-loaded)
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    geminiClientInstance = createGeminiClient();
  }
  return geminiClientInstance;
}
