import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/status-pages/{slug}:
 *   get:
 *     summary: Get public status page
 *     tags: [Status Pages]
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const statusPage = await prisma.statusPage.findUnique({
      where: { slug: req.params.slug },
    });

    if (!statusPage) {
      throw new AppError('Status page not found', 404);
    }

    if (!statusPage.public) {
      throw new AppError('Status page is private', 403);
    }

    // Get monitors
    const monitors = await prisma.monitor.findMany({
      where: {
        id: { in: statusPage.monitorIds },
      },
      select: {
        id: true,
        name: true,
        url: true,
        method: true,
      },
    });

    // Get latest check for each monitor
    const monitorsWithStatus = await Promise.all(
      monitors.map(async (monitor) => {
        const latestCheck = await prisma.check.findFirst({
          where: { monitorId: monitor.id },
          orderBy: { createdAt: 'desc' },
          select: {
            success: true,
            responseTime: true,
            statusCode: true,
            createdAt: true,
          },
        });

        // Get uptime for last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const checks = await prisma.check.findMany({
          where: {
            monitorId: monitor.id,
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        const uptime = checks.length > 0
          ? (checks.filter(c => c.success).length / checks.length) * 100
          : 100;

        return {
          ...monitor,
          status: latestCheck?.success ? 'operational' : 'down',
          latestCheck,
          uptime: parseFloat(uptime.toFixed(2)),
        };
      })
    );

    // Get recent incidents
    const recentIncidents = await prisma.incident.findMany({
      where: {
        monitorId: { in: statusPage.monitorIds },
        startedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        monitor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    res.json({
      ...statusPage,
      monitors: monitorsWithStatus,
      incidents: recentIncidents,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/status-pages:
 *   post:
 *     summary: Create status page
 *     tags: [Status Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { slug, title, description, public: isPublic, monitorIds } = req.body;

    if (!slug || !title) {
      throw new AppError('slug and title are required', 400);
    }

    // Verify user owns all monitors
    if (monitorIds && monitorIds.length > 0) {
      const monitors = await prisma.monitor.findMany({
        where: {
          id: { in: monitorIds },
          userId: req.user!.id,
        },
      });

      if (monitors.length !== monitorIds.length) {
        throw new AppError('Some monitors not found', 404);
      }
    }

    const statusPage = await prisma.statusPage.create({
      data: {
        slug,
        title,
        description,
        public: isPublic || false,
        monitorIds: monitorIds || [],
      },
    });

    res.status(201).json(statusPage);
  } catch (error) {
    next(error);
  }
});

export default router;
