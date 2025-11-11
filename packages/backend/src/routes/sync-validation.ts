import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { syncValidator } from '../lib/sync-validator';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/sync-validation/dashboard
 * Get sync quality dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const dashboard = await syncValidator.getDashboard(days);
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get sync validation dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

/**
 * GET /api/sync-validation/report/:projectId
 * Get sync quality report for a project
 */
router.get('/report/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const report = await syncValidator.getReport(projectId);
    
    if (!report) {
      return res.status(404).json({ error: 'No sync report found for this project' });
    }
    
    res.json(report);
  } catch (error) {
    logger.error('Failed to get sync report:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

/**
 * POST /api/sync-validation/validate/:projectId
 * Validate synchronization for a project
 */
router.post('/validate/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { finalAudioPath } = req.body;

    if (!finalAudioPath) {
      return res.status(400).json({ error: 'finalAudioPath is required' });
    }

    const report = await syncValidator.validateSync(projectId, finalAudioPath);
    
    res.json(report);
  } catch (error) {
    logger.error('Failed to validate sync:', error);
    res.status(500).json({ error: 'Failed to validate synchronization' });
  }
});

/**
 * GET /api/sync-validation/visualization/:projectId
 * Get alignment visualization data
 */
router.get('/visualization/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const visualization = await syncValidator.generateAlignmentVisualization(projectId);
    
    res.json(visualization);
  } catch (error) {
    logger.error('Failed to generate visualization:', error);
    res.status(500).json({ error: 'Failed to generate visualization' });
  }
});

export default router;
