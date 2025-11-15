import * as Sentry from '@sentry/node';
// Note: nodeProfilingIntegration is available in @sentry/profiling-node v8+
// For older versions, profiling integration is included in @sentry/node

/**
 * Initialize Sentry for worker error tracking
 */
export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Sentry error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out sensitive data
    beforeSend(event, _hint) {
      return event;
    },
  });

  console.log('Sentry initialized for worker error tracking');
}

/**
 * Capture exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message with severity level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): void {
  Sentry.startSpan({
    name,
    op,
  }, () => {});
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return fn().catch((error) => {
    captureException(error, context);
    throw error;
  });
}

export default Sentry;
