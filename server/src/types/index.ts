export interface MonitorConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  interval: number;
  timeout: number;
  expectedStatus?: number;
  validateSSL: boolean;
  jsonSchema?: any;
  bodyRegex?: string;
  regions: string[];
}

export interface CheckResultData {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  sslValid?: boolean;
  sslExpiresAt?: Date;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface AlertRuleConfig {
  name: string;
  condition: 'DOWN' | 'SLOW' | 'STATUS_CODE' | 'SSL_EXPIRY' | 'CUSTOM';
  threshold?: number;
  consecutiveFails?: number;
  email: boolean;
  webhook: boolean;
  webhookUrl?: string;
  sms: boolean;
  smsNumber?: string;
}

export interface IncidentData {
  monitorId: string;
  userId: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
