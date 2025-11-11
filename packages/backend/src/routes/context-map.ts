/**
 * Context Map API Routes
 * 
 * Provides endpoints for accessing and managing Context Maps
 */

import { Router, Request, Response } from 'express';
import { contextMapService } from '../lib/context-map';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/projects/:projectId/context-map
 * Get the Context Map for a project
 */
router.get('/:projectId/context-map', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const contextMap = await contextMapService.get(projectId);

    if (!contextMap) {
      return res.status(404).json({
        error: {
          code: 'CONTEXT_MAP_NOT_FOUND',
          message: 'Context Map not found for this project',
          retryable: false,
        },
      });
    }

    res.json(contextMap);
  } catch (error) {
    logger.error('Error fetching Context Map:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch Context Map',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/projects/:projectId/context-map/summary
 * Get summary statistics for a Context Map
 */
router.get('/:projectId/context-map/summary', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const summary = await contextMapService.getSummary(projectId);

    res.json(summary);
  } catch (error) {
    logger.error('Error fetching Context Map summary:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'CONTEXT_MAP_NOT_FOUND',
          message: error.message,
          retryable: false,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch Context Map summary',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/projects/:projectId/context-map/export
 * Export Context Map as JSON for debugging
 */
router.get('/:projectId/context-map/export', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const jsonContent = await contextMapService.exportToJson(projectId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="context_map_${projectId}.json"`);
    res.send(jsonContent);
  } catch (error) {
    logger.error('Error exporting Context Map:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'CONTEXT_MAP_NOT_FOUND',
          message: error.message,
          retryable: false,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export Context Map',
        retryable: true,
      },
    });
  }
});

/**
 * GET /api/projects/:projectId/context-map/validate
 * Validate Context Map structure
 */
router.get('/:projectId/context-map/validate', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const contextMap = await contextMapService.get(projectId);

    if (!contextMap) {
      return res.status(404).json({
        error: {
          code: 'CONTEXT_MAP_NOT_FOUND',
          message: 'Context Map not found for this project',
          retryable: false,
        },
      });
    }

    const validation = contextMapService.validateContextMap(contextMap);

    res.json(validation);
  } catch (error) {
    logger.error('Error validating Context Map:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate Context Map',
        retryable: true,
      },
    });
  }
});

/**
 * PUT /api/projects/:projectId/context-map/segments/:segmentId
 * Update a specific segment in the Context Map
 */
router.put('/:projectId/context-map/segments/:segmentId', async (req: Request, res: Response) => {
  try {
    const { projectId, segmentId } = req.params;
    const updates = req.body;

    const contextMap = await contextMapService.updateSegment(
      projectId,
      parseInt(segmentId, 10),
      updates
    );

    res.json(contextMap);
  } catch (error) {
    logger.error('Error updating Context Map segment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          retryable: false,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update Context Map segment',
        retryable: true,
      },
    });
  }
});

export default router;
