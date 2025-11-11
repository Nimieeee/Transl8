import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { audioQualityMonitor } from '../lib/audio-quality-monitor';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/audio-quality/dashboard
 * Get comprehensive audio quality dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const dashboard = await audioQualityMonitor.getDashboard(days);
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get audio quality dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

/**
 * GET /api/audio-quality/project/:projectId
 * Get audio quality metrics for a specific project
 */
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const metrics = await audioQualityMonitor.getProjectMetrics(projectId);
    
    res.json({ metrics });
  } catch (error) {
    logger.error('Failed to get project audio quality metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * POST /api/audio-quality/record
 * Record audio quality metrics for a segment
 */
router.post('/record', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      segmentId,
      vocalIsolationSnr,
      spectralPurity,
      noiseReductionSnr,
      noiseReductionDb,
      ttsQualityScore,
      ttsConfidence,
    } = req.body;

    if (!projectId || segmentId === undefined) {
      return res.status(400).json({ error: 'projectId and segmentId are required' });
    }

    await audioQualityMonitor.recordMetrics({
      projectId,
      segmentId,
      vocalIsolationSnr,
      spectralPurity,
      noiseReductionSnr,
      noiseReductionDb,
      ttsQualityScore,
      ttsConfidence,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to record audio quality metrics:', error);
    res.status(500).json({ error: 'Failed to record metrics' });
  }
});

export default router;
