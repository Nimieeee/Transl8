import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { adaptationMetricsService } from '../lib/adaptation-metrics';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/adaptation-metrics/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    const dashboardData = await adaptationMetricsService.getDashboardData(days);
    
    res.json(dashboardData);
  } catch (error) {
    logger.error('Failed to get adaptation metrics dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

/**
 * GET /api/adaptation-metrics/language-pair/:source/:target
 * Get metrics for a specific language pair
 */
router.get('/language-pair/:source/:target', authenticateToken, async (req, res) => {
  try {
    const { source, target } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const metrics = await adaptationMetricsService.getLanguagePairMetrics(
      source,
      target,
      startDate,
      endDate
    );
    
    if (!metrics) {
      return res.status(404).json({ error: 'No metrics found for this language pair' });
    }
    
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get language pair metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/adaptation-metrics/project/:projectId
 * Get metrics for a specific project
 */
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const metrics = await adaptationMetricsService.getProjectMetrics(projectId);
    
    if (!metrics) {
      return res.status(404).json({ error: 'No metrics found for this project' });
    }
    
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get project metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/adaptation-metrics/alerts
 * Get alert-worthy metrics (low success rates)
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 70;
    
    const alerts = await adaptationMetricsService.getAlerts(threshold);
    
    res.json({ alerts });
  } catch (error) {
    logger.error('Failed to get alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

export default router;
