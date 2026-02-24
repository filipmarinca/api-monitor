import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { incidentQueue } from '../jobs/queue';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Get all incidents
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, monitorId, limit = '50', offset = '0' } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (status) {
      where.status = status;
    }

    if (monitorId) {
      where.monitorId = monitorId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        alerts: true,
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.incident.count({ where });

    res.json({
      incidents,
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
 * /api/incidents/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/acknowledge', async (req: AuthRequest, res, next) => {
  try {
    const incident = await prisma.incident.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    await incidentQueue.add({
      action: 'acknowledge',
      incidentId: incident.id,
      userId: req.user!.id,
    });

    res.json({ message: 'Incident acknowledgement queued' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/incidents/{id}/resolve:
 *   post:
 *     summary: Manually resolve an incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/resolve', async (req: AuthRequest, res, next) => {
  try {
    const incident = await prisma.incident.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!incident) {
      throw new AppError('Incident not found', 404);
    }

    await incidentQueue.add({
      action: 'resolve',
      incidentId: incident.id,
    });

    res.json({ message: 'Incident resolution queued' });
  } catch (error) {
    next(error);
  }
});

export default router;
