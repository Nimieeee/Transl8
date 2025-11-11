/**
 * DataDog APM Configuration (Optional)
 *
 * To enable DataDog APM:
 * 1. Install: npm install dd-trace
 * 2. Set DD_API_KEY environment variable
 * 3. Import this file at the very top of index.ts (before any other imports)
 *
 * Note: This file is optional and only used if DataDog APM is desired.
 * Sentry already provides performance monitoring capabilities.
 */

let tracer: any = null;

export function initDataDog(): void {
  if (!process.env.DD_API_KEY) {
    console.log('DataDog APM not configured (DD_API_KEY not set)');
    return;
  }

  try {
    // Dynamic import to avoid errors if dd-trace is not installed
    tracer = require('dd-trace');

    tracer.init({
      service: 'dubbing-backend',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',

      // Enable log injection for correlation
      logInjection: true,

      // Sampling rate
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Enable profiling
      profiling: true,

      // Enable runtime metrics
      runtimeMetrics: true,

      // Tags
      tags: {
        team: 'platform',
        component: 'backend',
      },
    });

    console.log('DataDog APM initialized');
  } catch (error) {
    console.warn('DataDog APM initialization failed:', error);
  }
}

export function getTracer() {
  return tracer;
}

/**
 * Create a custom span for tracing
 */
export function createSpan(name: string, options?: any) {
  if (!tracer) return null;

  return tracer.trace(name, options, (span: any) => {
    return span;
  });
}

/**
 * Add tags to current span
 */
export function addSpanTags(tags: Record<string, any>) {
  if (!tracer) return;

  const span = tracer.scope().active();
  if (span) {
    Object.entries(tags).forEach(([key, value]) => {
      span.setTag(key, value);
    });
  }
}

/**
 * Wrap async function with tracing
 */
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, any>
): Promise<T> {
  if (!tracer) {
    return fn();
  }

  return tracer.trace(name, async (span: any) => {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    try {
      const result = await fn();
      span.setTag('status', 'success');
      return result;
    } catch (error) {
      span.setTag('status', 'error');
      span.setTag('error', true);
      if (error instanceof Error) {
        span.setTag('error.message', error.message);
        span.setTag('error.stack', error.stack);
      }
      throw error;
    }
  });
}
