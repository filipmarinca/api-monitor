import { Router } from 'express';
import { metricsRegistry } from '../index';

const router = Router();

/**
 * @swagger
 * /api/metrics/prometheus:
 *   get:
 *     summary: Get Prometheus metrics
 *     tags: [Metrics]
 */
router.get('/prometheus', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

export default router;
