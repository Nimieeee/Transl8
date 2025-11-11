// @ts-nocheck
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(app: Express): void {
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
    
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      
      // Enable profiling
      new ProfilingIntegration(),
    ],
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive query parameters
      if (event.request?.query_string) {
        const sensitiveParams = ['token', 'password', 'api_key'];
        sensitiveParams.forEach(param => {
          if (event.request?.query_string?.includes(param)) {
            event.request.query_string = event.request.query_string.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=[REDACTED]`
            );
          }
        });
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser errors that shouldn't reach backend
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors
      'ECONNREFUSED',
      'ENOTFOUND',
      // Rate limiting
      'Too Many Requests',
    ],
  });

  console.log('Sentry initialized for error tracking and performance monitoring');
}

/**
 * Get Sentry request handler middleware
 */
export function getSentryRequestHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler middleware
 */
export function getSentryTracingHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 */
export function getSentryErrorHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_error: any, _req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      if (error.status && error.status >= 500) {
        return true;
      }
      // Capture all unhandled errors
      return true;
    },
  });
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
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
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
export function startTransaction(name: string, op: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
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
