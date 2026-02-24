import { Job } from 'bull';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { sendEmail } from '../alerts/emailAlert';
import { sendWebhook } from '../alerts/webhookAlert';
import { sendSMS } from '../alerts/smsAlert';

interface AlertJob {
  ruleId: string;
  monitorId: string;
  message: string;
}

export const alertWorker = async (job: Job<AlertJob>) => {
  const { ruleId, monitorId, message } = job.data;

  try {
    const rule = await prisma.alertRule.findUnique({
      where: { id: ruleId },
      include: {
        monitor: true,
        user: true,
      },
    });

    if (!rule || !rule.enabled) {
      logger.warn(`Alert rule ${ruleId} not found or disabled`);
      return;
    }

    // Find or create incident
    let incident = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (!incident) {
      incident = await prisma.incident.create({
        data: {
          monitorId,
          userId: rule.userId,
          title: `Alert: ${rule.name}`,
          description: message,
          severity: 'MEDIUM',
          status: 'OPEN',
        },
      });
    }

    const alertPromises = [];

    // Email alert
    if (rule.email) {
      alertPromises.push(
        sendEmailAlert(incident.id, rule.user.email, rule.monitor.name, message)
      );
    }

    // Webhook alert
    if (rule.webhook && rule.webhookUrl) {
      alertPromises.push(
        sendWebhookAlert(incident.id, rule.webhookUrl, rule.monitor, message)
      );
    }

    // SMS alert
    if (rule.sms && rule.smsNumber) {
      alertPromises.push(
        sendSMSAlert(incident.id, rule.smsNumber, rule.monitor.name, message)
      );
    }

    await Promise.allSettled(alertPromises);

    logger.info(`Sent alerts for rule ${ruleId}`);
  } catch (error) {
    logger.error('Alert worker error:', error);
    throw error;
  }
};

async function sendEmailAlert(incidentId: string, email: string, monitorName: string, message: string) {
  try {
    await sendEmail({
      to: email,
      subject: `Alert: ${monitorName}`,
      text: message,
      html: `
        <h2>Monitor Alert</h2>
        <p><strong>Monitor:</strong> ${monitorName}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    });

    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'EMAIL',
        recipient: email,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to send email alert:', error);
    
    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'EMAIL',
        recipient: email,
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}

async function sendWebhookAlert(incidentId: string, webhookUrl: string, monitor: any, message: string) {
  try {
    await sendWebhook(webhookUrl, {
      type: 'monitor.alert',
      monitor: {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
      },
      message,
      timestamp: new Date().toISOString(),
    });

    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'WEBHOOK',
        recipient: webhookUrl,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to send webhook alert:', error);
    
    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'WEBHOOK',
        recipient: webhookUrl,
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}

async function sendSMSAlert(incidentId: string, phoneNumber: string, monitorName: string, message: string) {
  try {
    await sendSMS(phoneNumber, `Alert: ${monitorName} - ${message}`);

    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'SMS',
        recipient: phoneNumber,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to send SMS alert:', error);
    
    await prisma.alert.create({
      data: {
        incidentId,
        channel: 'SMS',
        recipient: phoneNumber,
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}
