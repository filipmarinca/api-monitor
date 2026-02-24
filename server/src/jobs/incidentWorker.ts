import { Job } from 'bull';
import { prisma, io } from '../index';
import { logger } from '../utils/logger';

interface IncidentJob {
  action: 'create' | 'resolve' | 'acknowledge';
  incidentId?: string;
  monitorId?: string;
  userId?: string;
  title?: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const incidentWorker = async (job: Job<IncidentJob>) => {
  const { action, incidentId, monitorId, userId, title, description, severity } = job.data;

  try {
    if (action === 'create' && monitorId && userId) {
      const incident = await prisma.incident.create({
        data: {
          monitorId,
          userId,
          title: title || 'Monitor incident',
          description,
          severity: severity || 'MEDIUM',
          status: 'OPEN',
        },
        include: {
          monitor: true,
        },
      });

      logger.info(`Created incident ${incident.id} for monitor ${monitorId}`);

      // Emit real-time update
      io.to(`monitor:${monitorId}`).emit('incident:created', incident);
      io.emit('incident:created', incident); // Global broadcast

      // Update metrics
      const openCount = await prisma.incident.count({
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      });
      metrics.setActiveIncidents(openCount);

      return incident;
    }

    if (action === 'resolve' && incidentId) {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
        include: {
          monitor: true,
        },
      });

      logger.info(`Resolved incident ${incidentId}`);

      // Emit real-time update
      io.to(`monitor:${incident.monitorId}`).emit('incident:resolved', incident);
      io.emit('incident:resolved', incident);

      // Update metrics
      const openCount = await prisma.incident.count({
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      });
      metrics.setActiveIncidents(openCount);

      return incident;
    }

    if (action === 'acknowledge' && incidentId && userId) {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        },
        include: {
          monitor: true,
        },
      });

      logger.info(`Acknowledged incident ${incidentId} by user ${userId}`);

      io.to(`monitor:${incident.monitorId}`).emit('incident:acknowledged', incident);

      return incident;
    }
  } catch (error) {
    logger.error('Incident worker error:', error);
    throw error;
  }
};

const { metrics } = require('../utils/metrics');
