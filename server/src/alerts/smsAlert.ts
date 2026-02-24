import { logger } from '../utils/logger';

// Twilio SDK would be imported here if credentials are provided
// import twilio from 'twilio';

export async function sendSMS(to: string, message: string): Promise<void> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio not configured, skipping SMS');
      return;
    }

    // Uncomment when Twilio is configured:
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: to,
    // });

    logger.info(`SMS would be sent to ${to}: ${message}`);
  } catch (error) {
    logger.error('Failed to send SMS:', error);
    throw error;
  }
}
