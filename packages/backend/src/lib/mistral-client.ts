/**
 * Mistral AI API Client
 *
 * Wrapper for Mistral AI API for translation and validation tasks.
 */

import { logger } from './logger';

export interface MistralConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MistralResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class MistralClient {
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 500ms between requests (allows 2 req/sec)
  private modelFallbackOrder: string[] = [
    'mistral-small-latest', // Smaller, faster, higher capacity
    'mistral-medium-latest', // Medium size
    'mistral-large-latest', // Largest, best quality but limited capacity
  ];
  private currentModelIndex: number = 0;

  constructor(config: MistralConfig) {
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'mistral-small-latest'; // Start with small model
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens || 8192;
  }

  /**
   * Wait to respect rate limits (only on retries)
   */
  private async waitForRateLimit(retryCount: number = 0): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Only wait on retries or if we're going too fast
    if (retryCount > 0) {
      // Exponential backoff on retries: 1s, 2s, 4s
      const backoffWait = 1000 * Math.pow(2, retryCount - 1);
      logger.debug(`Rate limiting: waiting ${backoffWait}ms (retry backoff)`);
      await new Promise((resolve) => setTimeout(resolve, backoffWait));
    } else if (timeSinceLastRequest < this.minRequestInterval) {
      // Normal rate limiting
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get next fallback model
   */
  private getNextModel(): string | null {
    this.currentModelIndex++;
    if (this.currentModelIndex >= this.modelFallbackOrder.length) {
      return null;
    }
    return this.modelFallbackOrder[this.currentModelIndex];
  }

  /**
   * Reset model fallback to start
   */
  private resetModelFallback(): void {
    this.currentModelIndex = 0;
  }

  /**
   * Generate text using Mistral API with retry and model fallback
   */
  async generate(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      retryCount?: number;
    }
  ): Promise<MistralResponse> {
    const requestedModel = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const retryCount = options?.retryCount || 0;

    const startTime = Date.now();

    try {
      // Wait to respect rate limits with exponential backoff
      await this.waitForRateLimit(retryCount);

      const url = `${this.baseUrl}/chat/completions`;

      const requestBody = {
        model: requestedModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      };

      logger.debug(`Calling Mistral API with model: ${requestedModel}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Mistral API error: ${response.status} - ${errorText}`);

        // Handle capacity exceeded - try fallback model
        if (response.status === 429 && errorText.includes('service_tier_capacity_exceeded')) {
          const nextModel = this.getNextModel();
          if (nextModel && retryCount < 2) {
            logger.warn(`Model ${requestedModel} capacity exceeded, trying fallback: ${nextModel}`);
            return this.generate(prompt, {
              ...options,
              model: nextModel,
              retryCount: retryCount + 1,
            });
          }
          throw new Error('All Mistral models at capacity. Please try again later.');
        }

        // Handle rate limiting - retry with backoff
        if (response.status === 429) {
          if (retryCount < 2) {
            const backoffTime = 1000 * Math.pow(2, retryCount); // 1s, 2s
            logger.warn(`Rate limited, retrying in ${backoffTime}ms (attempt ${retryCount + 1}/2)`);
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            return this.generate(prompt, {
              ...options,
              retryCount: retryCount + 1,
            });
          }
          throw new Error('Rate limit exceeded after retries. Please try again later.');
        }

        throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as any;

      // Extract text from response
      const text = this.extractText(data);

      const duration = Date.now() - startTime;
      logger.debug(`Mistral API call completed in ${duration}ms`);

      // Reset model fallback on success
      this.resetModelFallback();

      // Extract usage information if available
      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined;

      // Log interaction for debugging
      this.logInteraction(prompt, text, requestedModel, duration, usage);

      return {
        text,
        usage,
      };
    } catch (error) {
      logger.error('Mistral API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate translation using Mistral (starts with small model)
   */
  async translate(prompt: string): Promise<string> {
    const response = await this.generate(prompt, {
      model: 'mistral-small-latest', // Start with small model for better capacity
      temperature: 0.7,
    });

    // Strip surrounding quotes if present
    let text = response.text.trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      text = text.slice(1, -1);
    }

    return text;
  }

  /**
   * Validate translation using Mistral (starts with small model)
   */
  async validate(prompt: string): Promise<string> {
    const response = await this.generate(prompt, {
      model: 'mistral-small-latest', // Start with small model for better capacity
      temperature: 0.3,
    });

    return response.text.trim();
  }

  /**
   * Extract text from Mistral API response
   */
  private extractText(data: any): string {
    try {
      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];

        // Check finish reason for issues
        if (choice.finish_reason) {
          if (choice.finish_reason === 'length') {
            logger.warn('Mistral stopped due to max_tokens limit');
          } else if (choice.finish_reason !== 'stop') {
            logger.warn(`Mistral stopped with reason: ${choice.finish_reason}`);
          }
        }

        if (choice.message && choice.message.content) {
          const text = choice.message.content || '';
          if (!text) {
            logger.warn('Empty text in response despite valid structure');
            logger.debug('Full choice:', JSON.stringify(choice));
          }
          return text;
        }
      }

      logger.warn('Unexpected Mistral API response structure');
      logger.debug('Full response:', JSON.stringify(data, null, 2));
      return '';
    } catch (error) {
      logger.error('Failed to extract text from Mistral response:', error);
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
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ) {
    const promptPreview = prompt.substring(0, 200);
    const responsePreview = response.substring(0, 200);

    logger.debug('LLM Interaction:', {
      model,
      duration_ms: duration,
      prompt_length: prompt.length,
      response_length: response.length,
      usage,
      prompt_preview: promptPreview,
      response_preview: responsePreview,
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate('Say "Hello"', {
        model: 'mistral-small-latest', // Use small model for testing
        maxTokens: 100,
      });

      return response.text.length > 0;
    } catch (error) {
      logger.error('Mistral API connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create Mistral client from environment variables
 */
export function createMistralClient(): MistralClient {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY environment variable is required');
  }

  return new MistralClient({
    apiKey,
    model: 'mistral-small-latest', // Start with small model for better capacity
    temperature: 0.7,
    maxTokens: 8192,
  });
}

/**
 * Singleton instance
 */
let mistralClient: MistralClient | null = null;

export function getMistralClient(): MistralClient {
  if (!mistralClient) {
    mistralClient = createMistralClient();
  }
  return mistralClient;
}
