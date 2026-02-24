import axios from 'axios';
import { logger } from '../utils/logger';

export async function sendWebhook(url: string, payload: any): Promise<void> {
  try {
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Monitor/1.0',
      },
      timeout: 10000,
    });

    logger.info(`Webhook sent to ${url}`);
  } catch (error) {
    logger.error('Failed to send webhook:', error);
    throw error;
  }
}

export function formatSlackPayload(monitor: any, message: string) {
  return {
    text: `🚨 Monitor Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Monitor Alert',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Monitor:*\n${monitor.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*URL:*\n${monitor.url}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n${message}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Triggered at ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}

export function formatDiscordPayload(monitor: any, message: string) {
  return {
    embeds: [
      {
        title: '🚨 Monitor Alert',
        color: 0xff0000,
        fields: [
          {
            name: 'Monitor',
            value: monitor.name,
            inline: true,
          },
          {
            name: 'URL',
            value: monitor.url,
            inline: true,
          },
          {
            name: 'Message',
            value: message,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
