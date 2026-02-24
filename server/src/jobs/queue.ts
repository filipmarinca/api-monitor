import Bull from 'bull';
import { redis } from '../index';
import { logger } from '../utils/logger';
import { monitorCheckWorker } from './monitorCheckWorker';
import { alertWorker } from './alertWorker';
import { incidentWorker } from './incidentWorker';

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

export const monitorQueue = new Bull('monitor-checks', redisConfig);
export const alertQueue = new Bull('alerts', redisConfig);
export const incidentQueue = new Bull('incidents', redisConfig);

export async function initializeQueues() {
  // Monitor check queue
  monitorQueue.process(10, monitorCheckWorker); // Process up to 10 jobs concurrently
  
  monitorQueue.on('completed', (job) => {
    logger.info(`Monitor check job ${job.id} completed for monitor ${job.data.monitorId}`);
  });
  
  monitorQueue.on('failed', (job, err) => {
    logger.error(`Monitor check job ${job?.id} failed:`, err);
  });

  // Alert queue
  alertQueue.process(5, alertWorker);
  
  alertQueue.on('completed', (job) => {
    logger.info(`Alert job ${job.id} completed`);
  });
  
  alertQueue.on('failed', (job, err) => {
    logger.error(`Alert job ${job?.id} failed:`, err);
  });

  // Incident queue
  incidentQueue.process(5, incidentWorker);
  
  incidentQueue.on('completed', (job) => {
    logger.info(`Incident job ${job.id} completed`);
  });
  
  incidentQueue.on('failed', (job, err) => {
    logger.error(`Incident job ${job?.id} failed:`, err);
  });

  logger.info('All queues initialized');
}

export async function scheduleMonitorCheck(monitorId: string, interval: number) {
  await monitorQueue.add(
    { monitorId },
    {
      repeat: {
        every: interval,
      },
      jobId: `monitor-${monitorId}`,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  
  logger.info(`Scheduled monitor ${monitorId} with interval ${interval}ms`);
}

export async function unscheduleMonitorCheck(monitorId: string) {
  await monitorQueue.removeRepeatable({
    jobId: `monitor-${monitorId}`,
  } as any);
  
  logger.info(`Unscheduled monitor ${monitorId}`);
}
