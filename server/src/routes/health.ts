import { Router } from 'express';
import { prisma, redis } from '../index';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 */
router.get('/', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     tags: [Health]
 */
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

export default router;
