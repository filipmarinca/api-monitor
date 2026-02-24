import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Registry } from 'prom-client';
import swaggerUi from 'swagger-ui-express';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { initializeQueues } from './jobs/queue';
import { initializeMetrics } from './utils/metrics';
import { swaggerSpec } from './utils/swagger';

// Routes
import authRoutes from './routes/auth';
import monitorRoutes from './routes/monitors';
import checkRoutes from './routes/checks';
import incidentRoutes from './routes/incidents';
import alertRoutes from './routes/alerts';
import statusPageRoutes from './routes/statusPages';
import metricsRoutes from './routes/metrics';
import healthRoutes from './routes/health';

dotenv.config();

export const prisma = new PrismaClient();
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
});

export const metricsRegistry = new Registry();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/status-pages', statusPageRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
if (process.env.ENABLE_PROMETHEUS === 'true') {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });
}

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  socket.on('subscribe:monitor', (monitorId: string) => {
    socket.join(`monitor:${monitorId}`);
    logger.info(`Socket ${socket.id} subscribed to monitor ${monitorId}`);
  });
  
  socket.on('unsubscribe:monitor', (monitorId: string) => {
    socket.leave(`monitor:${monitorId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected');

    // Initialize Prometheus metrics
    if (process.env.ENABLE_PROMETHEUS === 'true') {
      initializeMetrics(metricsRegistry);
      logger.info('Prometheus metrics initialized');
    }

    // Initialize Bull queues
    await initializeQueues();
    logger.info('Job queues initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`API docs available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check at http://localhost:${PORT}/health`);
      if (process.env.ENABLE_PROMETHEUS === 'true') {
        logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
});

start();
