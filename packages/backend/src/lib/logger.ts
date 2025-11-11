import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID storage using AsyncLocalStorage
 */
class CorrelationIdStore {
  private storage = new Map<string, string>();

  set(id: string): void {
    this.storage.set('current', id);
  }

  get(): string | undefined {
    return this.storage.get('current');
  }

  clear(): void {
    this.storage.delete('current');
  }
}

export const correlationIdStore = new CorrelationIdStore();

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `req-${uuidv4()}`;
}

/**
 * Custom format for adding correlation ID to logs
 */
const correlationIdFormat = winston.format((info) => {
  const correlationId = correlationIdStore.get();
  if (correlationId) {
    info.correlationId = correlationId;
  }
  return info;
});

/**
 * Custom format for development (human-readable)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  correlationIdFormat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const corrId = correlationId ? `[${correlationId}]` : '';
    return `${timestamp} ${level} ${corrId}: ${message} ${metaStr}`;
  })
);

/**
 * Custom format for production (JSON)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  correlationIdFormat(),
  winston.format.json()
);

/**
 * Create Winston logger instance
 */
function createLogger() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isDevelopment ? developmentFormat : productionFormat,
    }),
  ];

  // Add file transports in production
  if (!isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: productionFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: productionFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    transports,
    exitOnError: false,
  });
}

export const logger = createLogger();

/**
 * Middleware to add correlation ID to requests
 */
export function correlationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    // Get correlation ID from header or generate new one
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();

    // Store in request object
    req.correlationId = correlationId;

    // Set in response header
    res.setHeader('x-correlation-id', correlationId);

    // Store in correlation ID store
    correlationIdStore.set(correlationId);

    // Log request
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Log response
    res.on('finish', () => {
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - req._startTime,
      });

      // Clear correlation ID after request
      correlationIdStore.clear();
    });

    // Store start time
    req._startTime = Date.now();

    next();
  };
}

/**
 * Log with context
 */
export function logWithContext(
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  context?: Record<string, any>
): void {
  logger.log(level, message, context);
}

/**
 * Log error with stack trace
 */
export function logError(error: Error, context?: Record<string, any>): void {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
}

/**
 * Log database query
 */
export function logDatabaseQuery(
  operation: string,
  duration: number,
  success: boolean,
  query?: string
): void {
  const level = success ? 'debug' : 'error';
  const message = success ? 'Database query executed' : 'Database query failed';

  logger.log(level, message, {
    operation,
    duration,
    success,
    query: query ? query.substring(0, 200) : undefined, // Truncate long queries
  });

  // Log slow queries as warnings
  if (success && duration > 1000) {
    logger.warn('Slow database query detected', {
      operation,
      duration,
      query: query ? query.substring(0, 200) : undefined,
    });
  }
}

/**
 * Log job processing
 */
export function logJobProcessing(
  stage: string,
  jobId: string,
  status: 'started' | 'completed' | 'failed',
  context?: Record<string, any>
): void {
  const level = status === 'failed' ? 'error' : 'info';
  const message = `Job ${status}`;

  logger.log(level, message, {
    stage,
    jobId,
    status,
    ...context,
  });
}

/**
 * Log model inference
 */
export function logModelInference(
  model: string,
  duration: number,
  success: boolean,
  context?: Record<string, any>
): void {
  const level = success ? 'info' : 'error';
  const message = success ? 'Model inference completed' : 'Model inference failed';

  logger.log(level, message, {
    model,
    duration,
    success,
    ...context,
  });
}

/**
 * Log WebSocket event
 */
export function logWebSocketEvent(
  event: string,
  connectionId: string,
  context?: Record<string, any>
): void {
  logger.info('WebSocket event', {
    event,
    connectionId,
    ...context,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: Record<string, any>
): void {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

  logger.log(level, `Security event: ${event}`, {
    event,
    severity,
    ...context,
  });
}

/**
 * Log API rate limit event
 */
export function logRateLimitEvent(ip: string, userId?: string, endpoint?: string): void {
  logger.warn('Rate limit exceeded', {
    ip,
    userId,
    endpoint,
  });
}

/**
 * Create child logger with default context
 */
export function createChildLogger(defaultContext: Record<string, any>) {
  return {
    error: (message: string, context?: Record<string, any>) =>
      logger.error(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: Record<string, any>) =>
      logger.warn(message, { ...defaultContext, ...context }),
    info: (message: string, context?: Record<string, any>) =>
      logger.info(message, { ...defaultContext, ...context }),
    debug: (message: string, context?: Record<string, any>) =>
      logger.debug(message, { ...defaultContext, ...context }),
  };
}

export default logger;
