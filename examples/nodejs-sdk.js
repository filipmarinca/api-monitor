#!/usr/bin/env node

/**
 * API Monitor Node.js SDK Example
 * 
 * Install: npm install axios
 * Usage: node examples/nodejs-sdk.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const API_KEY = 'your-api-key-here'; // Get from dashboard

class APIMonitorClient {
  constructor(apiKey, baseURL = API_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Monitors
  async createMonitor(config) {
    const response = await this.client.post('/monitors', config);
    return response.data;
  }

  async getMonitors() {
    const response = await this.client.get('/monitors');
    return response.data;
  }

  async getMonitor(id) {
    const response = await this.client.get(`/monitors/${id}`);
    return response.data;
  }

  async updateMonitor(id, updates) {
    const response = await this.client.put(`/monitors/${id}`, updates);
    return response.data;
  }

  async deleteMonitor(id) {
    await this.client.delete(`/monitors/${id}`);
  }

  async triggerCheck(id) {
    const response = await this.client.post(`/monitors/${id}/trigger`);
    return response.data;
  }

  // Stats
  async getStats(monitorId, period = '24h') {
    const response = await this.client.get('/checks/stats', {
      params: { monitorId, period },
    });
    return response.data;
  }

  async getChecks(monitorId, options = {}) {
    const response = await this.client.get('/checks', {
      params: { monitorId, ...options },
    });
    return response.data;
  }

  // Incidents
  async getIncidents(filters = {}) {
    const response = await this.client.get('/incidents', {
      params: filters,
    });
    return response.data;
  }

  async acknowledgeIncident(id) {
    const response = await this.client.post(`/incidents/${id}/acknowledge`);
    return response.data;
  }

  async resolveIncident(id) {
    const response = await this.client.post(`/incidents/${id}/resolve`);
    return response.data;
  }

  // Alert Rules
  async createAlertRule(config) {
    const response = await this.client.post('/alerts/rules', config);
    return response.data;
  }

  async getAlertRules(monitorId = null) {
    const response = await this.client.get('/alerts/rules', {
      params: monitorId ? { monitorId } : {},
    });
    return response.data;
  }
}

// Example usage
async function main() {
  const client = new APIMonitorClient(API_KEY);

  try {
    // Create a monitor
    console.log('Creating monitor...');
    const monitor = await client.createMonitor({
      name: 'Example API',
      url: 'https://api.example.com/health',
      method: 'GET',
      interval: 300000, // 5 minutes
      timeout: 30000,
      expectedStatus: 200,
      regions: ['us-east'],
    });
    console.log('Monitor created:', monitor.id);

    // Get monitor stats
    console.log('\nFetching stats...');
    const stats = await client.getStats(monitor.id, '24h');
    console.log('Uptime:', stats.uptime + '%');
    console.log('Avg Response Time:', stats.responseTime.avg + 'ms');
    console.log('Total Checks:', stats.totalChecks);

    // Create alert rule
    console.log('\nCreating alert rule...');
    const alertRule = await client.createAlertRule({
      monitorId: monitor.id,
      name: 'Downtime Alert',
      condition: 'DOWN',
      consecutiveFails: 3,
      email: true,
    });
    console.log('Alert rule created:', alertRule.id);

    // List all monitors
    console.log('\nAll monitors:');
    const monitors = await client.getMonitors();
    monitors.forEach((m) => {
      console.log(`- ${m.name} (${m.enabled ? 'enabled' : 'disabled'})`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = APIMonitorClient;
