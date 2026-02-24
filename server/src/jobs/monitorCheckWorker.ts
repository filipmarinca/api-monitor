import { Job } from 'bull';
import { prisma, io } from '../index';
import { monitorChecker } from '../monitors/checker';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { incidentQueue } from './queue';

interface MonitorCheckJob {
  monitorId: string;
  region?: string;
}

export const monitorCheckWorker = async (job: Job<MonitorCheckJob>) => {
  const { monitorId, region = 'us-east' } = job.data;

  try {
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: {
        alertRules: {
          where: { enabled: true },
        },
      },
    });

    if (!monitor || !monitor.enabled) {
      logger.warn(`Monitor ${monitorId} not found or disabled`);
      return;
    }

    // Run all region checks
    const regions = monitor.regions.length > 0 ? monitor.regions : [region];
    
    for (const checkRegion of regions) {
      const result = await monitorChecker.check(monitor, checkRegion);
      
      // Record metrics
      metrics.recordMonitorCheck(
        monitor.id,
        checkRegion,
        result.success,
        result.responseTime
      );

      // Save check result
      const check = await prisma.check.create({
        data: {
          monitorId: monitor.id,
          region: checkRegion,
          requestedAt: new Date(),
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          success: result.success,
          error: result.error,
          sslValid: result.sslValid,
          sslExpiresAt: result.sslExpiresAt,
          responseHeaders: result.responseHeaders || {},
          responseBody: result.responseBody,
        },
      });

      // Emit real-time update via Socket.io
      io.to(`monitor:${monitor.id}`).emit('check:completed', {
        monitorId: monitor.id,
        check: {
          id: check.id,
          region: checkRegion,
          success: result.success,
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          timestamp: check.createdAt,
        },
      });

      // Check for incidents
      if (!result.success) {
        await handleFailure(monitor, result, check);
      } else {
        await handleSuccess(monitor);
      }

      // Check alert rules
      for (const rule of monitor.alertRules) {
        await evaluateAlertRule(rule, monitor, result);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Monitor check worker error for ${monitorId}:`, error);
    throw error;
  }
};

async function handleFailure(monitor: any, result: any, check: any) {
  // Check if there's an existing open incident
  const openIncident = await prisma.incident.findFirst({
    where: {
      monitorId: monitor.id,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
  });

  if (!openIncident) {
    // Get recent checks to determine if we should create an incident
    const recentChecks = await prisma.check.findMany({
      where: {
        monitorId: monitor.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const consecutiveFails = recentChecks.filter(c => !c.success).length;

    if (consecutiveFails >= 3) {
      // Create incident
      await incidentQueue.add({
        action: 'create',
        monitorId: monitor.id,
        userId: monitor.userId,
        title: `${monitor.name} is down`,
        description: result.error || 'Monitor check failed',
        severity: 'HIGH',
      });
    }
  }
}

async function handleSuccess(monitor: any) {
  // Check if there's an open incident to resolve
  const openIncident = await prisma.incident.findFirst({
    where: {
      monitorId: monitor.id,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
  });

  if (openIncident) {
    await incidentQueue.add({
      action: 'resolve',
      incidentId: openIncident.id,
    });
  }
}

async function evaluateAlertRule(rule: any, monitor: any, result: any) {
  let shouldAlert = false;
  let message = '';

  switch (rule.condition) {
    case 'DOWN':
      if (!result.success) {
        shouldAlert = true;
        message = `Monitor ${monitor.name} is down: ${result.error}`;
      }
      break;
    
    case 'SLOW':
      if (result.responseTime && rule.threshold && result.responseTime > rule.threshold) {
        shouldAlert = true;
        message = `Monitor ${monitor.name} is slow: ${result.responseTime}ms (threshold: ${rule.threshold}ms)`;
      }
      break;
    
    case 'STATUS_CODE':
      if (result.statusCode && result.statusCode !== monitor.expectedStatus) {
        shouldAlert = true;
        message = `Monitor ${monitor.name} returned unexpected status: ${result.statusCode} (expected: ${monitor.expectedStatus})`;
      }
      break;
    
    case 'SSL_EXPIRY':
      if (result.sslExpiresAt) {
        const daysUntilExpiry = (result.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < (rule.threshold || 30)) {
          shouldAlert = true;
          message = `SSL certificate for ${monitor.name} expires in ${Math.floor(daysUntilExpiry)} days`;
        }
      }
      break;
  }

  if (shouldAlert) {
    const { alertQueue } = require('./queue');
    await alertQueue.add({
      ruleId: rule.id,
      monitorId: monitor.id,
      message,
    });
  }
}
