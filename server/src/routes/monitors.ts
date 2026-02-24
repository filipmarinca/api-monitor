import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { scheduleMonitorCheck, unscheduleMonitorCheck } from '../jobs/queue';
import { metrics } from '../utils/metrics';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/monitors:
 *   get:
 *     summary: Get all monitors
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: {
          select: {
            checks: true,
            incidents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest check for each monitor
    const monitorsWithStatus = await Promise.all(
      monitors.map(async (monitor) => {
        const latestCheck = await prisma.check.findFirst({
          where: { monitorId: monitor.id },
          orderBy: { createdAt: 'desc' },
        });

        return {
          ...monitor,
          latestCheck,
        };
      })
    );

    res.json(monitorsWithStatus);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   get:
 *     summary: Get monitor by ID
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        alertRules: true,
        _count: {
          select: {
            checks: true,
            incidents: true,
          },
        },
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    res.json(monitor);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/monitors:
 *   post:
 *     summary: Create a new monitor
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const {
      name,
      url,
      method = 'GET',
      headers,
      body,
      interval = 300000,
      timeout = 30000,
      expectedStatus = 200,
      validateSSL = true,
      jsonSchema,
      bodyRegex,
      regions = ['us-east'],
      workspaceId,
    } = req.body;

    if (!name || !url) {
      throw new AppError('Name and URL are required', 400);
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new AppError('Invalid URL format', 400);
    }

    // Get or create workspace
    let workspace;
    if (workspaceId) {
      workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          members: {
            some: { userId: req.user!.id },
          },
        },
      });
      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }
    } else {
      // Get user's first workspace
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.user!.id },
        include: { workspace: true },
      });
      
      if (!membership) {
        // Create default workspace
        workspace = await prisma.workspace.create({
          data: {
            name: `${req.user!.email}'s Workspace`,
            slug: `${req.user!.email.split('@')[0]}-${Date.now()}`,
            members: {
              create: {
                userId: req.user!.id,
                role: 'OWNER',
              },
            },
          },
        });
      } else {
        workspace = membership.workspace;
      }
    }

    const monitor = await prisma.monitor.create({
      data: {
        name,
        url,
        method,
        headers: headers || {},
        body: body || {},
        interval,
        timeout,
        expectedStatus,
        validateSSL,
        jsonSchema,
        bodyRegex,
        regions,
        workspaceId: workspace.id,
        userId: req.user!.id,
        enabled: true,
      },
    });

    // Schedule monitoring job
    await scheduleMonitorCheck(monitor.id, monitor.interval);

    // Update metrics
    const activeCount = await prisma.monitor.count({
      where: { enabled: true },
    });
    metrics.setActiveMonitors(activeCount);

    res.status(201).json(monitor);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   put:
 *     summary: Update monitor
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const existingMonitor = await prisma.monitor.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existingMonitor) {
      throw new AppError('Monitor not found', 404);
    }

    const {
      name,
      url,
      method,
      headers,
      body,
      interval,
      timeout,
      expectedStatus,
      validateSSL,
      jsonSchema,
      bodyRegex,
      regions,
      enabled,
    } = req.body;

    const monitor = await prisma.monitor.update({
      where: { id: req.params.id },
      data: {
        name,
        url,
        method,
        headers,
        body,
        interval,
        timeout,
        expectedStatus,
        validateSSL,
        jsonSchema,
        bodyRegex,
        regions,
        enabled,
      },
    });

    // Reschedule if interval changed or enabled state changed
    if (interval !== existingMonitor.interval || enabled !== existingMonitor.enabled) {
      await unscheduleMonitorCheck(monitor.id);
      if (enabled) {
        await scheduleMonitorCheck(monitor.id, interval);
      }
    }

    res.json(monitor);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/monitors/{id}:
 *   delete:
 *     summary: Delete monitor
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    await unscheduleMonitorCheck(monitor.id);
    await prisma.monitor.delete({
      where: { id: req.params.id },
    });

    // Update metrics
    const activeCount = await prisma.monitor.count({
      where: { enabled: true },
    });
    metrics.setActiveMonitors(activeCount);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/monitors/{id}/trigger:
 *   post:
 *     summary: Manually trigger monitor check
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/trigger', async (req: AuthRequest, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    const { monitorQueue } = require('../jobs/queue');
    await monitorQueue.add({ monitorId: monitor.id }, { priority: 1 });

    res.json({ message: 'Check triggered successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
