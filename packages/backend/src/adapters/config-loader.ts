/**
 * Model Configuration Loader
 *
 * Loads model configurations from JSON file and initializes the model registry
 *
 * Requirements: 14.2, 14.4
 */

import fs from 'fs';
import path from 'path';
import { ModelConfig, PipelineStage } from './model-registry';

/**
 * Configuration file structure
 */
interface ConfigFile {
  models: {
    stt: ModelConfig[];
    mt: ModelConfig[];
    tts: ModelConfig[];
    lipsync: ModelConfig[];
    vocal_isolation: ModelConfig[];
  };
  defaults: {
    stt: string;
    mt: string;
    tts: string;
    lipsync: string;
    vocal_isolation: string;
  };
  healthCheck: {
    intervalSeconds: number;
    timeoutSeconds: number;
    retryAttempts: number;
  };
}

/**
 * Load model configurations from JSON file
 */
export function loadModelConfig(configPath?: string): ConfigFile {
  const defaultPath = path.join(__dirname, 'model-config.json');
  const filePath = configPath || defaultPath;

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config: ConfigFile = JSON.parse(fileContent);

    // Validate configuration structure
    validateConfig(config);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load model config from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate configuration file structure
 */
function validateConfig(config: ConfigFile): void {
  if (!config.models) {
    throw new Error('Configuration missing "models" section');
  }

  const stages: PipelineStage[] = ['stt', 'mt', 'tts', 'lipsync', 'vocal_isolation'];

  for (const stage of stages) {
    if (!Array.isArray(config.models[stage])) {
      throw new Error(`Configuration missing or invalid "models.${stage}" array`);
    }

    for (const modelConfig of config.models[stage]) {
      if (!modelConfig.name || !modelConfig.version || !modelConfig.stage) {
        throw new Error(
          `Invalid model configuration in ${stage}: missing required fields (name, version, stage)`
        );
      }

      if (modelConfig.stage !== stage) {
        throw new Error(
          `Model ${modelConfig.name} has stage "${modelConfig.stage}" but is in "${stage}" section`
        );
      }
    }
  }

  if (!config.defaults) {
    throw new Error('Configuration missing "defaults" section');
  }

  for (const stage of stages) {
    if (!config.defaults[stage]) {
      throw new Error(`Configuration missing default model for stage "${stage}"`);
    }
  }
}

/**
 * Get all model configurations for a stage
 */
export function getStageConfigs(config: ConfigFile, stage: PipelineStage): ModelConfig[] {
  return config.models[stage] || [];
}

/**
 * Get default model name for a stage
 */
export function getDefaultModel(config: ConfigFile, stage: PipelineStage): string {
  return config.defaults[stage];
}

/**
 * Get health check configuration
 */
export function getHealthCheckConfig(config: ConfigFile) {
  return config.healthCheck;
}

/**
 * Save model configuration to JSON file
 */
export function saveModelConfig(config: ConfigFile, configPath?: string): void {
  const defaultPath = path.join(__dirname, 'model-config.json');
  const filePath = configPath || defaultPath;

  try {
    const fileContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(filePath, fileContent, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save model config to ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Update model configuration in config file
 */
export function updateModelInConfig(
  config: ConfigFile,
  stage: PipelineStage,
  modelName: string,
  updates: Partial<ModelConfig>
): ConfigFile {
  const models = config.models[stage];
  const index = models.findIndex((m) => m.name === modelName);

  if (index === -1) {
    throw new Error(`Model ${modelName} not found in stage ${stage}`);
  }

  models[index] = { ...models[index], ...updates };

  return config;
}

/**
 * Add new model to configuration
 */
export function addModelToConfig(
  config: ConfigFile,
  stage: PipelineStage,
  modelConfig: ModelConfig
): ConfigFile {
  const models = config.models[stage];

  // Check if model already exists
  const exists = models.some((m) => m.name === modelConfig.name);
  if (exists) {
    throw new Error(`Model ${modelConfig.name} already exists in stage ${stage}`);
  }

  models.push(modelConfig);

  return config;
}

/**
 * Remove model from configuration
 */
export function removeModelFromConfig(
  config: ConfigFile,
  stage: PipelineStage,
  modelName: string
): ConfigFile {
  const models = config.models[stage];
  const index = models.findIndex((m) => m.name === modelName);

  if (index === -1) {
    throw new Error(`Model ${modelName} not found in stage ${stage}`);
  }

  models.splice(index, 1);

  // If this was the default model, clear the default
  if (config.defaults[stage] === modelName) {
    config.defaults[stage] = models.length > 0 ? models[0].name : '';
  }

  return config;
}

/**
 * Set default model for a stage
 */
export function setDefaultModel(
  config: ConfigFile,
  stage: PipelineStage,
  modelName: string
): ConfigFile {
  const models = config.models[stage];
  const exists = models.some((m) => m.name === modelName);

  if (!exists) {
    throw new Error(`Model ${modelName} not found in stage ${stage}`);
  }

  config.defaults[stage] = modelName;

  return config;
}
