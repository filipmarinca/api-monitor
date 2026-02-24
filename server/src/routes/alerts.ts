import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/alerts/rules:
 *   get:
 *     summary: Get all alert rules
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/rules', async (req: AuthRequest, res, next) => {
  try {
    const { monitorId } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (monitorId) {
      where.monitorId = monitorId;
    }

    const rules = await prisma.alertRule.findMany({
      where,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules:
 *   post:
 *     summary: Create alert rule
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/rules', async (req: AuthRequest, res, next) => {
  try {
    const {
      monitorId,
      name,
      condition,
      threshold,
      consecutiveFails = 3,
      email = false,
      webhook = false,
      webhookUrl,
      sms = false,
      smsNumber,
    } = req.body;

    if (!monitorId || !name || !condition) {
      throw new AppError('monitorId, name, and condition are required', 400);
    }

    // Verify user owns monitor
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: req.user!.id,
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    const rule = await prisma.alertRule.create({
      data: {
        monitorId,
        userId: req.user!.id,
        name,
        condition,
        threshold,
        consecutiveFails,
        email,
        webhook,
        webhookUrl,
        sms,
        smsNumber,
        enabled: true,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules/{id}:
 *   put:
 *     summary: Update alert rule
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.put('/rules/:id', async (req: AuthRequest, res, next) => {
  try {
    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingRule) {
      throw new AppError('Alert rule not found', 404);
    }

    const rule = await prisma.alertRule.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules/{id}:
 *   delete:
 *     summary: Delete alert rule
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/rules/:id', async (req: AuthRequest, res, next) => {
  try {
    const rule = await prisma.alertRule.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!rule) {
      throw new AppError('Alert rule not found', 404);
    }

    await prisma.alertRule.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/history:
 *   get:
 *     summary: Get alert history
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    // Get all incidents for user's monitors
    const alerts = await prisma.alert.findMany({
      where: {
        incident: {
          userId: req.user!.id,
        },
      },
      include: {
        incident: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

export default router;
