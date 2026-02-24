export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  apiKey?: string;
  createdAt: string;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  interval: number;
  timeout: number;
  enabled: boolean;
  expectedStatus?: number;
  validateSSL: boolean;
  jsonSchema?: any;
  bodyRegex?: string;
  regions: string[];
  workspaceId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  latestCheck?: Check;
  _count?: {
    checks: number;
    incidents: number;
  };
}

export interface Check {
  id: string;
  monitorId: string;
  region: string;
  requestedAt: string;
  statusCode?: number;
  responseTime?: number;
  success: boolean;
  error?: string;
  sslValid?: boolean;
  sslExpiresAt?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  userId: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description?: string;
  startedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  monitor?: {
    id: string;
    name: string;
    url: string;
  };
  alerts?: Alert[];
}

export interface AlertRule {
  id: string;
  monitorId: string;
  userId: string;
  name: string;
  enabled: boolean;
  condition: 'DOWN' | 'SLOW' | 'STATUS_CODE' | 'SSL_EXPIRY' | 'CUSTOM';
  threshold?: number;
  consecutiveFails?: number;
  email: boolean;
  webhook: boolean;
  webhookUrl?: string;
  sms: boolean;
  smsNumber?: string;
  createdAt: string;
  updatedAt: string;
  monitor?: {
    id: string;
    name: string;
  };
}

export interface Alert {
  id: string;
  incidentId: string;
  channel: 'EMAIL' | 'WEBHOOK' | 'SMS';
  recipient: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
  createdAt: string;
}

export interface CheckStats {
  period: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptime: number;
  responseTime: {
    avg: number;
    min: number;
    max: number;
  };
  timeline: Array<{
    timestamp: string;
    success: boolean;
    responseTime?: number;
    statusCode?: number;
  }>;
}

export interface StatusPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  monitorIds: string[];
  createdAt: string;
  updatedAt: string;
  monitors?: Array<Monitor & {
    status: string;
    uptime: number;
  }>;
  incidents?: Incident[];
}
