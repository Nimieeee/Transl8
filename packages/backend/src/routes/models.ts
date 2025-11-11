/**
 * Model Management API Routes
 * 
 * Endpoints for model health checks, configuration, and monitoring
 * 
 * Requirements: 14.2, 14.4
 */

import { Router, Request, Response } from 'express';
import { modelRegistry, PipelineStage } from '../adapters/model-registry';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/models/health
 * Get health status for all models
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const healthMap = await modelRegistry.checkAllHealth();
    
    const response: Record<string, any> = {};
    for (const [stage, health] of healthMap.entries()) {
      response[stage] = health;
    }

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking model health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check model health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/health/:stage
 * Get health status for models in a specific stage
 */
router.get('/health/:stage', async (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    const health = await modelRegistry.checkStageHealth(stage);

    res.json({
      success: true,
      data: {
        stage,
        models: health,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking stage health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check stage health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/health/:stage/:name
 * Get health status for a specific model
 */
router.get('/health/:stage/:name', async (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    const name = req.params.name;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    const health = await modelRegistry.checkHealth(stage, name);

    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking model health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check model health',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/summary
 * Get summary of all registered models
 */
router.get('/summary', (_req: Request, res: Response) => {
  try {
    const summary = modelRegistry.getSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting model summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/:stage
 * Get all models for a specific stage
 */
router.get('/:stage', (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    const configs = modelRegistry.getConfigs(stage);
    const health = modelRegistry.getStageHealth(stage);

    const models = configs.map(config => {
      const modelHealth = health.find(h => h.modelName === config.name);
      return {
        ...config,
        health: modelHealth?.status || 'unknown',
        lastCheck: modelHealth?.lastCheck,
        latency: modelHealth?.latency,
      };
    });

    res.json({
      success: true,
      data: {
        stage,
        models,
      },
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/:stage/:name
 * Get configuration for a specific model
 */
router.get('/:stage/:name', (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    const name = req.params.name;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    const config = modelRegistry.getConfig(stage, name);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Model not found',
        message: `Model ${name} not found in stage ${stage}`,
      });
    }

    const health = modelRegistry.getHealth(stage, name);

    res.json({
      success: true,
      data: {
        ...config,
        health: health?.status || 'unknown',
        lastCheck: health?.lastCheck,
        latency: health?.latency,
      },
    });
  } catch (error) {
    console.error('Error getting model config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/models/:stage/:name/enable
 * Enable or disable a model (requires authentication)
 */
router.put('/:stage/:name/enable', authenticateToken, (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    const name = req.params.name;
    const { enabled } = req.body;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'enabled must be a boolean',
      });
    }

    modelRegistry.setEnabled(stage, name, enabled);

    res.json({
      success: true,
      message: `Model ${name} ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error('Error updating model status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/models/:stage/:name/priority
 * Update model priority (requires authentication)
 */
router.put('/:stage/:name/priority', authenticateToken, (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as PipelineStage;
    const name = req.params.name;
    const { priority } = req.body;
    
    if (!['stt', 'mt', 'tts', 'lipsync'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'Stage must be one of: stt, mt, tts, lipsync',
      });
    }

    if (typeof priority !== 'number' || priority < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'priority must be a non-negative number',
      });
    }

    modelRegistry.updateConfig(stage, name, { priority });

    res.json({
      success: true,
      message: `Model ${name} priority updated to ${priority}`,
    });
  } catch (error) {
    console.error('Error updating model priority:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model priority',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
