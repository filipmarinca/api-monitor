import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';
import { logger } from '../utils/logger';
import { Monitor } from '@prisma/client';

export interface CheckResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  sslValid?: boolean;
  sslExpiresAt?: Date;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export class MonitorChecker {
  private async getSSLInfo(url: string): Promise<{ valid: boolean; expiresAt: Date } | null> {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') return null;

      return new Promise((resolve) => {
        const req = https.get(url, (res) => {
          const cert = (res.socket as any)?.getPeerCertificate();
          if (cert && cert.valid_to) {
            resolve({
              valid: true,
              expiresAt: new Date(cert.valid_to),
            });
          } else {
            resolve(null);
          }
        });

        req.on('error', () => resolve(null));
        req.end();
      });
    } catch {
      return null;
    }
  }

  async check(monitor: Monitor, region: string = 'us-east'): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      const config: AxiosRequestConfig = {
        method: monitor.method.toLowerCase() as any,
        url: monitor.url,
        headers: (monitor.headers as any) || {},
        timeout: monitor.timeout,
        validateStatus: () => true, // Don't throw on any status
        maxRedirects: parseInt(process.env.MAX_REDIRECTS || '5'),
      };

      if (monitor.body && ['POST', 'PUT', 'PATCH'].includes(monitor.method)) {
        config.data = monitor.body;
      }

      const response: AxiosResponse = await axios(config);
      const responseTime = Date.now() - startTime;

      // Get SSL info for HTTPS
      const sslInfo = await this.getSSLInfo(monitor.url);

      // Validate response
      const success = this.validateResponse(monitor, response);

      return {
        success,
        statusCode: response.status,
        responseTime,
        error: success ? undefined : `Validation failed: expected ${monitor.expectedStatus}, got ${response.status}`,
        sslValid: sslInfo?.valid,
        sslExpiresAt: sslInfo?.expiresAt,
        responseHeaders: response.headers as Record<string, string>,
        responseBody: JSON.stringify(response.data).substring(0, 10000), // Limit body size
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      logger.error(`Monitor check failed for ${monitor.name}:`, error.message);
      
      return {
        success: false,
        responseTime,
        error: error.message || 'Unknown error',
      };
    }
  }

  private validateResponse(monitor: Monitor, response: AxiosResponse): boolean {
    // Status code validation
    if (monitor.expectedStatus && response.status !== monitor.expectedStatus) {
      return false;
    }

    // JSON schema validation
    if (monitor.jsonSchema) {
      try {
        const Ajv = require('ajv');
        const ajv = new Ajv();
        const validate = ajv.compile(monitor.jsonSchema);
        if (!validate(response.data)) {
          return false;
        }
      } catch (error) {
        logger.error('JSON schema validation failed:', error);
        return false;
      }
    }

    // Regex body validation
    if (monitor.bodyRegex) {
      try {
        const regex = new RegExp(monitor.bodyRegex);
        const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        if (!regex.test(body)) {
          return false;
        }
      } catch (error) {
        logger.error('Regex validation failed:', error);
        return false;
      }
    }

    return true;
  }

  async batchCheck(monitors: Monitor[], region: string = 'us-east'): Promise<Map<string, CheckResult>> {
    const results = new Map<string, CheckResult>();
    
    const promises = monitors.map(async (monitor) => {
      const result = await this.check(monitor, region);
      results.set(monitor.id, result);
    });

    await Promise.all(promises);
    return results;
  }
}

export const monitorChecker = new MonitorChecker();
