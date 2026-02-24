import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/checks:
 *   get:
 *     summary: Get checks for a monitor
 *     tags: [Checks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { monitorId, limit = '100', offset = '0', success } = req.query;

    if (!monitorId) {
      throw new AppError('monitorId query parameter is required', 400);
    }

    // Verify user owns this monitor
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId as string,
        userId: req.user!.id,
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    const where: any = {
      monitorId: monitorId as string,
    };

    if (success !== undefined) {
      where.success = success === 'true';
    }

    const checks = await prisma.check.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.check.count({ where });

    res.json({
      checks,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/checks/stats:
 *   get:
 *     summary: Get check statistics
 *     tags: [Checks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const { monitorId, period = '24h' } = req.query;

    if (!monitorId) {
      throw new AppError('monitorId query parameter is required', 400);
    }

    // Verify user owns this monitor
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId as string,
        userId: req.user!.id,
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    // Calculate time range
    const periodMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - (periodMap[period as string] || periodMap['24h']));

    const checks = await prisma.check.findMany({
      where: {
        monitorId: monitorId as string,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalChecks = checks.length;
    const successfulChecks = checks.filter(c => c.success).length;
    const failedChecks = totalChecks - successfulChecks;
    
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
    
    const avgResponseTime = checks.length > 0
      ? checks.reduce((sum, c) => sum + (c.responseTime || 0), 0) / checks.length
      : 0;

    const maxResponseTime = Math.max(...checks.map(c => c.responseTime || 0), 0);
    const minResponseTime = checks.length > 0
      ? Math.min(...checks.filter(c => c.responseTime).map(c => c.responseTime!))
      : 0;

    res.json({
      period,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptime: parseFloat(uptime.toFixed(2)),
      responseTime: {
        avg: Math.round(avgResponseTime),
        min: minResponseTime,
        max: maxResponseTime,
      },
      timeline: checks.map(c => ({
        timestamp: c.createdAt,
        success: c.success,
        responseTime: c.responseTime,
        statusCode: c.statusCode,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
