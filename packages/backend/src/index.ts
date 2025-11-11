import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { prisma, checkDatabaseConnection, disconnectPrisma } from './lib/prisma';
import { checkRedisConnection, disconnectRedis } from './lib/redis';
import { closeQueues } from './lib/queue';
import { setupQueueListeners, cleanupQueueListeners } from './lib/queue-listeners';
import { setupDeadLetterQueueListeners, closeDeadLetterQueue } from './lib/dead-letter-queue';
import { checkStorageConnection } from './lib/storage';
import { wsManager } from './lib/websocket';
import authRoutes from './routes/auth';
import dubRoutes from './routes/dub';
import subscriptionRoutes from './routes/subscription';
import projectRoutes from './routes/projects';
import queueRoutes from './routes/queue';
import jobRoutes from './routes/jobs';
import modelRoutes from './routes/models';
import glossaryRoutes from './routes/glossary';
import voiceRoutes from './routes/voices';
import metricsRoutes from './routes/metrics';
import betaRoutes from './routes/beta';
import feedbackRoutes from './routes/feedback';
import analyticsRoutes from './routes/analytics';
import supportRoutes from './routes/support';
import gdprRoutes from './routes/gdpr';
import legalRoutes from './routes/legal';
import moderationRoutes from './routes/moderation';
import licensingRoutes from './routes/licensing';
import contextMapRoutes from './routes/context-map';
import adaptationMetricsRoutes from './routes/adaptation-metrics';
import audioQualityRoutes from './routes/audio-quality';
import syncValidationRoutes from './routes/sync-validation';
import { corsOptions, handleCorsError } from './config/cors';
import {
  ipRateLimiter,
  userRateLimiter,
  sanitizeInput,
  securityHeaders,
  preventParameterPollution,
  requestSizeLimiter,
} from './middleware/security';
import {
  initSentry,
  getSentryRequestHandler,
  getSentryTracingHandler,
  getSentryErrorHandler,
} from './lib/sentry';
import { metricsMiddleware } from './lib/metrics';
import { correlationIdMiddleware, logger } from './lib/logger';
import { runStartupValidation } from './lib/pre-flight-validator';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.API_PORT || 3001;

// Initialize Sentry (must be first)
initSentry(app);

// Trust proxy (required when behind reverse proxy/load balancer)
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Initialize WebSocket server
wsManager.initialize(server);

// Initialize queue event listeners
setupQueueListeners();
setupDeadLetterQueueListeners();

// Sentry request handler (must be before other middleware)
app.use(getSentryRequestHandler());
app.use(getSentryTracingHandler());

// Correlation ID middleware (for request tracing)
app.use(correlationIdMiddleware());

// Security Middleware (applied in order)
// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// 2. Additional security headers
app.use(securityHeaders);

// 3. CORS configuration
app.use(cors(corsOptions));
app.use(handleCorsError);

// 4. Request size limiting
app.use(requestSizeLimiter('1gb'));

// 5. Body parser with size limits
// Special handling for Stripe webhooks - they need raw body for signature verification
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// 6. Input sanitization
app.use(sanitizeInput);
app.use(preventParameterPollution);

// 7. Rate limiting (IP-based for all routes)
// TEMPORARILY DISABLED FOR TESTING
// app.use(ipRateLimiter);

// 8. Metrics collection
app.use(metricsMiddleware());

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();
  const storageHealthy = await checkStorageConnection();
  
  res.json({
    status: dbHealthy && redisHealthy && storageHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected',
    storage: storageHealthy ? 'connected' : 'disconnected',
  });
});

// Database health check endpoint
app.get('/health/db', async (_req, res) => {
  try {
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      // Get some basic stats
      const userCount = await prisma.user.count();
      const projectCount = await prisma.project.count();
      
      res.json({
        status: 'ok',
        connected: true,
        stats: {
          users: userCount,
          projects: projectCount,
        },
      });
    } else {
      res.status(503).json({
        status: 'error',
        connected: false,
        message: 'Database connection failed',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'AI Video Dubbing Platform API' });
});

// Auth routes (with user-based rate limiting after authentication)
app.use('/api/auth', authRoutes);

// MVP dubbing routes (protected by auth middleware)
app.use('/api/dub', userRateLimiter, dubRoutes);

// Protected routes with user-based rate limiting
app.use('/api/subscription', userRateLimiter, subscriptionRoutes);
app.use('/api/projects', userRateLimiter, projectRoutes);
app.use('/api/projects', userRateLimiter, contextMapRoutes);
app.use('/api/adaptation-metrics', userRateLimiter, adaptationMetricsRoutes);
app.use('/api/audio-quality', userRateLimiter, audioQualityRoutes);
app.use('/api/sync-validation', userRateLimiter, syncValidationRoutes);
app.use('/api/queue', userRateLimiter, queueRoutes);
app.use('/api/jobs', userRateLimiter, jobRoutes);
app.use('/api/models', userRateLimiter, modelRoutes);
app.use('/api/glossary', userRateLimiter, glossaryRoutes);
app.use('/api/voices', userRateLimiter, voiceRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/beta', userRateLimiter, betaRoutes);
app.use('/api/feedback', userRateLimiter, feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', userRateLimiter, supportRoutes);
app.use('/api/gdpr', userRateLimiter, gdprRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/moderation', userRateLimiter, moderationRoutes);
app.use('/api/licensing', userRateLimiter, licensingRoutes);

// Global error handler (must be after all routes but before Sentry error handler)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error to console
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Send error response
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      retryable: true,
    },
  });
});

// Sentry error handler (must be after all routes and error handlers)
app.use(getSentryErrorHandler());

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  cleanupQueueListeners();
  wsManager.close();
  await closeQueues();
  await closeDeadLetterQueue();
  await disconnectPrisma();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  cleanupQueueListeners();
  wsManager.close();
  await closeQueues();
  await closeDeadLetterQueue();
  await disconnectPrisma();
  await disconnectRedis();
  process.exit(0);
});

// Run pre-flight validation before starting server
async function startServer() {
  try {
    // Run pre-flight validation
    // Set failOnError to false in development to allow startup even if validation fails
    const failOnError = process.env.NODE_ENV === 'production';
    await runStartupValidation(failOnError);
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Database health check available at http://localhost:${PORT}/health/db`);
      logger.info(`WebSocket server available at ws://localhost:${PORT}/ws`);
      logger.info(`Metrics available at http://localhost:${PORT}/api/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
