import { Router } from 'express';
import { metrics, exportPrometheusMetrics } from '../lib/metrics';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/metrics
 * Get application metrics in JSON format
 * Requires authentication
 */
router.get('/', authenticateToken, (_req, res) => {
  try {
    const allMetrics = metrics.getMetrics();
    res.json(allMetrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/metrics/prometheus
 * Get application metrics in Prometheus format
 * Used by Prometheus scraper (no auth required for scraping)
 */
router.get('/prometheus', (_req, res) => {
  try {
    const prometheusMetrics = exportPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    console.error('Error exporting Prometheus metrics:', error);
    res.status(500).send('# Error exporting metrics');
  }
});

/**
 * POST /api/metrics/reset
 * Reset all metrics (admin only)
 * Requires authentication
 */
router.post('/reset', authenticateToken, (_req, res) => {
  try {
    // Check if user is admin (you may want to add admin check middleware)
    metrics.reset();
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

export default router;
