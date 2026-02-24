import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

// Monitors
export const monitorsApi = {
  getAll: () => api.get('/monitors'),
  getOne: (id: string) => api.get(`/monitors/${id}`),
  create: (data: any) => api.post('/monitors', data),
  update: (id: string, data: any) => api.put(`/monitors/${id}`, data),
  delete: (id: string) => api.delete(`/monitors/${id}`),
  trigger: (id: string) => api.post(`/monitors/${id}/trigger`),
};

// Checks
export const checksApi = {
  getAll: (monitorId: string, params?: any) =>
    api.get('/checks', { params: { monitorId, ...params } }),
  getStats: (monitorId: string, period: string = '24h') =>
    api.get('/checks/stats', { params: { monitorId, period } }),
};

// Incidents
export const incidentsApi = {
  getAll: (params?: any) => api.get('/incidents', { params }),
  acknowledge: (id: string) => api.post(`/incidents/${id}/acknowledge`),
  resolve: (id: string) => api.post(`/incidents/${id}/resolve`),
};

// Alerts
export const alertsApi = {
  getRules: (monitorId?: string) =>
    api.get('/alerts/rules', { params: { monitorId } }),
  createRule: (data: any) => api.post('/alerts/rules', data),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  getHistory: (params?: any) => api.get('/alerts/history', { params }),
};

// Status Pages
export const statusPagesApi = {
  getBySlug: (slug: string) => api.get(`/status-pages/${slug}`),
  create: (data: any) => api.post('/status-pages', data),
};
