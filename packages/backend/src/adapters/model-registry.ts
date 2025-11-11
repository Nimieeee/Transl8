/**
 * Model Registry and Configuration System
 *
 * This module manages model selection, versioning, and health monitoring
 * for all AI model adapters in the pipeline.
 *
 * Requirements: 14.2, 14.4
 */

import {
  STTAdapter,
  MTAdapter,
  TTSAdapter,
  LipSyncAdapter,
  VocalIsolationAdapter,
  HealthCheckResult,
} from './types';

/**
 * Pipeline stage types
 */
export type PipelineStage = 'stt' | 'mt' | 'tts' | 'lipsync' | 'vocal_isolation';

/**
 * Model adapter type union
 */
export type ModelAdapter =
  | STTAdapter
  | MTAdapter
  | TTSAdapter
  | LipSyncAdapter
  | VocalIsolationAdapter;

/**
 * Model configuration entry
 */
export interface ModelConfig {
  name: string;
  version: string;
  stage: PipelineStage;
  enabled: boolean;
  priority: number; // Higher priority = preferred model
  capabilities?: {
    languages?: string[]; // Supported language codes
    maxDuration?: number; // Max processing duration in seconds
    requiresGPU?: boolean;
    supportsBatch?: boolean;
  };
  metadata?: {
    description?: string;
    author?: string;
    license?: string;
    documentation?: string;
  };
}

/**
 * Model health status
 */
export interface ModelHealth {
  modelName: string;
  stage: PipelineStage;
  lastCheck: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}

/**
 * Model Registry
 *
 * Manages registration, selection, and health monitoring of model adapters
 */
export class ModelRegistry {
  private adapters: Map<string, ModelAdapter> = new Map();
  private configs: Map<string, ModelConfig> = new Map();
  private healthStatus: Map<string, ModelHealth> = new Map();

  /**
   * Register a model adapter with configuration
   */
  register(adapter: ModelAdapter, config: ModelConfig): void {
    const key = this.getAdapterKey(config.stage, config.name);

    // Validate adapter matches config
    if (adapter.name !== config.name || adapter.version !== config.version) {
      throw new Error(
        `Adapter mismatch: expected ${config.name}@${config.version}, ` +
          `got ${adapter.name}@${adapter.version}`
      );
    }

    this.adapters.set(key, adapter);
    this.configs.set(key, config);

    // Initialize health status
    this.healthStatus.set(key, {
      modelName: config.name,
      stage: config.stage,
      lastCheck: new Date(),
      status: 'unknown',
    });

    console.log(`Registered model: ${key} (priority: ${config.priority})`);
  }

  /**
   * Unregister a model adapter
   */
  unregister(stage: PipelineStage, name: string): void {
    const key = this.getAdapterKey(stage, name);
    this.adapters.delete(key);
    this.configs.delete(key);
    this.healthStatus.delete(key);
    console.log(`Unregistered model: ${key}`);
  }

  /**
   * Get the best available adapter for a stage
   *
   * Selects based on:
   * 1. Enabled status
   * 2. Health status
   * 3. Priority
   * 4. Language support (if specified)
   */
  getAdapter<T extends ModelAdapter>(
    stage: PipelineStage,
    options?: {
      language?: string;
      preferredModel?: string;
    }
  ): T | null {
    // If preferred model specified, try to get it
    if (options?.preferredModel) {
      const key = this.getAdapterKey(stage, options.preferredModel);
      const adapter = this.adapters.get(key);
      const config = this.configs.get(key);

      if (adapter && config?.enabled) {
        return adapter as T;
      }
    }

    // Get all adapters for this stage
    const candidates: Array<{ adapter: ModelAdapter; config: ModelConfig; health: ModelHealth }> =
      [];

    for (const [key, adapter] of this.adapters.entries()) {
      const config = this.configs.get(key);
      const health = this.healthStatus.get(key);

      if (!config || config.stage !== stage || !config.enabled) {
        continue;
      }

      // Check language support if specified
      if (options?.language && config.capabilities?.languages) {
        if (!config.capabilities.languages.includes(options.language)) {
          continue;
        }
      }

      candidates.push({ adapter, config, health: health! });
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by health status (healthy first), then priority (higher first)
    candidates.sort((a, b) => {
      // Healthy models first
      if (a.health.status === 'healthy' && b.health.status !== 'healthy') {
        return -1;
      }
      if (a.health.status !== 'healthy' && b.health.status === 'healthy') {
        return 1;
      }

      // Then by priority
      return b.config.priority - a.config.priority;
    });

    return candidates[0].adapter as T;
  }

  /**
   * Get all adapters for a stage
   */
  getAdapters(stage: PipelineStage): ModelAdapter[] {
    const adapters: ModelAdapter[] = [];

    for (const [key, adapter] of this.adapters.entries()) {
      const config = this.configs.get(key);
      if (config?.stage === stage) {
        adapters.push(adapter);
      }
    }

    return adapters;
  }

  /**
   * Get model configuration
   */
  getConfig(stage: PipelineStage, name: string): ModelConfig | null {
    const key = this.getAdapterKey(stage, name);
    return this.configs.get(key) || null;
  }

  /**
   * Get all configurations for a stage
   */
  getConfigs(stage: PipelineStage): ModelConfig[] {
    const configs: ModelConfig[] = [];

    for (const [_key, config] of this.configs.entries()) {
      if (config.stage === stage) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Update model configuration
   */
  updateConfig(stage: PipelineStage, name: string, updates: Partial<ModelConfig>): void {
    const key = this.getAdapterKey(stage, name);
    const config = this.configs.get(key);

    if (!config) {
      throw new Error(`Model not found: ${key}`);
    }

    this.configs.set(key, { ...config, ...updates });
    console.log(`Updated config for ${key}`);
  }

  /**
   * Enable or disable a model
   */
  setEnabled(stage: PipelineStage, name: string, enabled: boolean): void {
    this.updateConfig(stage, name, { enabled });
  }

  /**
   * Get health status for a model
   */
  getHealth(stage: PipelineStage, name: string): ModelHealth | null {
    const key = this.getAdapterKey(stage, name);
    return this.healthStatus.get(key) || null;
  }

  /**
   * Get health status for all models in a stage
   */
  getStageHealth(stage: PipelineStage): ModelHealth[] {
    const health: ModelHealth[] = [];

    for (const [_key, status] of this.healthStatus.entries()) {
      if (status.stage === stage) {
        health.push(status);
      }
    }

    return health;
  }

  /**
   * Perform health check on a specific model
   */
  async checkHealth(stage: PipelineStage, name: string): Promise<ModelHealth> {
    const key = this.getAdapterKey(stage, name);
    const adapter = this.adapters.get(key);

    if (!adapter) {
      throw new Error(`Model not found: ${key}`);
    }

    try {
      const result: HealthCheckResult = await adapter.healthCheck();

      const health: ModelHealth = {
        modelName: name,
        stage,
        lastCheck: new Date(),
        status: result.healthy ? 'healthy' : 'unhealthy',
        latency: result.latency,
        error: result.error,
      };

      this.healthStatus.set(key, health);
      return health;
    } catch (error) {
      const health: ModelHealth = {
        modelName: name,
        stage,
        lastCheck: new Date(),
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.healthStatus.set(key, health);
      return health;
    }
  }

  /**
   * Perform health checks on all models in a stage
   */
  async checkStageHealth(stage: PipelineStage): Promise<ModelHealth[]> {
    const adapters = this.getAdapters(stage);
    const results = await Promise.all(
      adapters.map((adapter) => this.checkHealth(stage, adapter.name))
    );
    return results;
  }

  /**
   * Perform health checks on all registered models
   */
  async checkAllHealth(): Promise<Map<PipelineStage, ModelHealth[]>> {
    const stages: PipelineStage[] = ['stt', 'mt', 'tts', 'lipsync', 'vocal_isolation'];
    const results = new Map<PipelineStage, ModelHealth[]>();

    for (const stage of stages) {
      const health = await this.checkStageHealth(stage);
      results.set(stage, health);
    }

    return results;
  }

  /**
   * Get all registered models summary
   */
  getSummary(): {
    stage: PipelineStage;
    models: Array<{
      name: string;
      version: string;
      enabled: boolean;
      priority: number;
      health: string;
    }>;
  }[] {
    const stages: PipelineStage[] = ['stt', 'mt', 'tts', 'lipsync', 'vocal_isolation'];

    return stages.map((stage) => ({
      stage,
      models: this.getConfigs(stage).map((config) => {
        const health = this.getHealth(stage, config.name);
        return {
          name: config.name,
          version: config.version,
          enabled: config.enabled,
          priority: config.priority,
          health: health?.status || 'unknown',
        };
      }),
    }));
  }

  /**
   * Clear all registered models
   */
  clear(): void {
    this.adapters.clear();
    this.configs.clear();
    this.healthStatus.clear();
  }

  /**
   * Generate adapter key from stage and name
   */
  private getAdapterKey(stage: PipelineStage, name: string): string {
    return `${stage}:${name}`;
  }
}

/**
 * Global model registry instance
 */
export const modelRegistry = new ModelRegistry();
