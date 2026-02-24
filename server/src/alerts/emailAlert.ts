import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      logger.warn('SMTP not configured, skipping email');
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'API Monitor <noreply@apimonitor.dev>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });

    logger.info(`Email sent to ${options.to}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}
