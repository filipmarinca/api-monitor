import { monitorChecker } from '../checker';
import { Monitor } from '@prisma/client';

describe('MonitorChecker', () => {
  const mockMonitor: Monitor = {
    id: 'test-id',
    name: 'Test Monitor',
    url: 'https://httpstat.us/200',
    method: 'GET',
    headers: null,
    body: null,
    interval: 60000,
    timeout: 10000,
    enabled: true,
    expectedStatus: 200,
    validateSSL: true,
    jsonSchema: null,
    bodyRegex: null,
    regions: ['us-east'],
    workspaceId: 'workspace-id',
    userId: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should successfully check a healthy endpoint', async () => {
    const result = await monitorChecker.check(mockMonitor);
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.responseTime).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('should detect failed endpoint', async () => {
    const failedMonitor = { ...mockMonitor, url: 'https://httpstat.us/500' };
    const result = await monitorChecker.check(failedMonitor);
    
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
  });

  it('should timeout on slow endpoint', async () => {
    const slowMonitor = { 
      ...mockMonitor, 
      url: 'https://httpstat.us/200?sleep=5000',
      timeout: 1000,
    };
    const result = await monitorChecker.check(slowMonitor);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should validate SSL for HTTPS', async () => {
    const result = await monitorChecker.check(mockMonitor);
    
    if (mockMonitor.url.startsWith('https')) {
      expect(result.sslValid).toBeDefined();
      expect(result.sslExpiresAt).toBeDefined();
    }
  });
});
