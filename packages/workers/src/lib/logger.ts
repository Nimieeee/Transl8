import winston from 'winston';

/**
 * Custom format for development (human-readable)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

/**
 * Custom format for production (JSON)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
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
