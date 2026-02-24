import { Counter, Histogram, Gauge, Registry } from 'prom-client';

let httpRequestDuration: Histogram<string> | null = null;
let httpRequestTotal: Counter<string> | null = null;
let monitorChecksTotal: Counter<string> | null = null;
let monitorCheckDuration: Histogram<string> | null = null;
let activeMonitors: Gauge<string> | null = null;
let activeIncidents: Gauge<string> | null = null;

export function initializeMetrics(register: Registry) {
  // HTTP request metrics
  httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  // Monitor check metrics
  monitorChecksTotal = new Counter({
    name: 'monitor_checks_total',
    help: 'Total number of monitor checks',
    labelNames: ['monitor_id', 'status', 'region'],
    registers: [register],
  });

  monitorCheckDuration = new Histogram({
    name: 'monitor_check_duration_milliseconds',
    help: 'Duration of monitor checks in milliseconds',
    labelNames: ['monitor_id', 'region'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
    registers: [register],
  });

  activeMonitors = new Gauge({
    name: 'active_monitors',
    help: 'Number of active monitors',
    registers: [register],
  });

  activeIncidents = new Gauge({
    name: 'active_incidents',
    help: 'Number of open incidents',
    registers: [register],
  });

  // Collect default metrics (CPU, memory, etc.)
  register.setDefaultLabels({
    app: 'api-monitor',
  });
}

export const metrics = {
  recordHttpRequest: (method: string, route: string, statusCode: number, duration: number) => {
    httpRequestDuration?.labels(method, route, statusCode.toString()).observe(duration);
    httpRequestTotal?.labels(method, route, statusCode.toString()).inc();
  },
  
  recordMonitorCheck: (monitorId: string, region: string, success: boolean, duration: number) => {
    monitorChecksTotal?.labels(monitorId, success ? 'success' : 'failure', region).inc();
    monitorCheckDuration?.labels(monitorId, region).observe(duration);
  },
  
  setActiveMonitors: (count: number) => {
    activeMonitors?.set(count);
  },
  
  setActiveIncidents: (count: number) => {
    activeIncidents?.set(count);
  },
};
