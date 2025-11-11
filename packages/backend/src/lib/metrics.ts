/**
 * Application Metrics Collection
 * 
 * This module provides in-memory metrics collection for monitoring
 * API performance, job queue metrics, and system health.
 */

interface MetricValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
  values?: number[];
}

interface Metrics {
  [key: string]: MetricValue;
}

class MetricsCollector {
  private metrics: Metrics = {};
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
  }

  /**
   * Time an async function execution
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, tags);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, { ...tags, status: 'error' });
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, MetricValue>;
    uptime: number;
  } {
    const histogramMetrics: Record<string, MetricValue> = {};
    
    this.histograms.forEach((values, key) => {
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      histogramMetrics[key] = {
        count: values.length,
        sum,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / values.length,
        p50: this.percentile(sorted, 0.5),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
      };
    });

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramMetrics,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Build metric key with tags
   */
  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

/**
 * Middleware to track API request metrics
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Track request
    metrics.incrementCounter('http.requests.total', 1, {
      method: req.method,
      path: req.route?.path || req.path,
    });

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      metrics.recordHistogram('http.request.duration', duration, {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode.toString(),
      });
      
      if (res.statusCode >= 400) {
        metrics.incrementCounter('http.errors.total', 1, {
          method: req.method,
          path: req.route?.path || req.path,
          status: res.statusCode.toString(),
        });
      }
    });

    next();
  };
}

/**
 * Track job queue metrics
 */
export class JobMetrics {
  static recordJobStart(stage: string, jobId: string): void {
    metrics.incrementCounter('jobs.started.total', 1, { stage });
    metrics.setGauge(`jobs.active.${stage}`, 1);
  }

  static recordJobComplete(stage: string, jobId: string, duration: number): void {
    metrics.incrementCounter('jobs.completed.total', 1, { stage });
    metrics.recordHistogram('jobs.duration', duration, { stage, status: 'success' });
    metrics.setGauge(`jobs.active.${stage}`, 0);
  }

  static recordJobFailure(stage: string, jobId: string, duration: number, error: string): void {
    metrics.incrementCounter('jobs.failed.total', 1, { stage, error });
    metrics.recordHistogram('jobs.duration', duration, { stage, status: 'failed' });
    metrics.setGauge(`jobs.active.${stage}`, 0);
  }

  static recordQueueDepth(stage: string, depth: number): void {
    metrics.setGauge('jobs.queue.depth', depth, { stage });
  }
}

/**
 * Track WebSocket metrics
 */
export class WebSocketMetrics {
  static recordConnection(): void {
    metrics.incrementCounter('websocket.connections.total', 1);
  }

  static recordDisconnection(): void {
    metrics.incrementCounter('websocket.disconnections.total', 1);
  }

  static setActiveConnections(count: number): void {
    metrics.setGauge('websocket.connections.active', count);
  }

  static recordMessage(type: string): void {
    metrics.incrementCounter('websocket.messages.total', 1, { type });
  }

  static recordMessageLatency(latency: number): void {
    metrics.recordHistogram('websocket.message.latency', latency);
  }
}

/**
 * Track database metrics
 */
export class DatabaseMetrics {
  static recordQuery(operation: string, duration: number, success: boolean): void {
    metrics.recordHistogram('database.query.duration', duration, {
      operation,
      status: success ? 'success' : 'error',
    });
    
    if (!success) {
      metrics.incrementCounter('database.errors.total', 1, { operation });
    }
  }

  static recordSlowQuery(operation: string, duration: number, query: string): void {
    metrics.incrementCounter('database.slow_queries.total', 1, { operation });
    console.warn(`Slow query detected (${duration}ms):`, query);
  }
}

/**
 * Track model inference metrics
 */
export class ModelMetrics {
  static recordInference(
    model: string,
    duration: number,
    success: boolean,
    inputSize?: number
  ): void {
    metrics.recordHistogram('model.inference.duration', duration, {
      model,
      status: success ? 'success' : 'error',
    });
    
    if (inputSize) {
      metrics.recordHistogram('model.input.size', inputSize, { model });
    }
    
    if (!success) {
      metrics.incrementCounter('model.errors.total', 1, { model });
    }
  }

  static recordGPUUtilization(model: string, utilization: number): void {
    metrics.setGauge('model.gpu.utilization', utilization, { model });
  }

  static recordMemoryUsage(model: string, bytes: number): void {
    metrics.setGauge('model.memory.usage', bytes, { model });
  }
}

/**
 * Export metrics in Prometheus format
 */
export function exportPrometheusMetrics(): string {
  const allMetrics = metrics.getMetrics();
  const lines: string[] = [];

  // Counters
  Object.entries(allMetrics.counters).forEach(([key, value]) => {
    const { name, tags } = parseMetricKey(key);
    const labels = formatPrometheusLabels(tags);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name}${labels} ${value}`);
  });

  // Gauges
  Object.entries(allMetrics.gauges).forEach(([key, value]) => {
    const { name, tags } = parseMetricKey(key);
    const labels = formatPrometheusLabels(tags);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name}${labels} ${value}`);
  });

  // Histograms
  Object.entries(allMetrics.histograms).forEach(([key, value]) => {
    const { name, tags } = parseMetricKey(key);
    const labels = formatPrometheusLabels(tags);
    lines.push(`# TYPE ${name} histogram`);
    lines.push(`${name}_count${labels} ${value.count}`);
    lines.push(`${name}_sum${labels} ${value.sum}`);
    lines.push(`${name}_min${labels} ${value.min}`);
    lines.push(`${name}_max${labels} ${value.max}`);
    lines.push(`${name}_avg${labels} ${value.avg}`);
    if (value.p50) lines.push(`${name}_p50${labels} ${value.p50}`);
    if (value.p95) lines.push(`${name}_p95${labels} ${value.p95}`);
    if (value.p99) lines.push(`${name}_p99${labels} ${value.p99}`);
  });

  // Uptime
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${allMetrics.uptime / 1000}`);

  return lines.join('\n');
}

function parseMetricKey(key: string): { name: string; tags: Record<string, string> } {
  const match = key.match(/^([^{]+)(?:\{([^}]+)\})?$/);
  if (!match) return { name: key, tags: {} };

  const name = match[1];
  const tagsString = match[2];
  const tags: Record<string, string> = {};

  if (tagsString) {
    tagsString.split(',').forEach(tag => {
      const [k, v] = tag.split(':');
      tags[k] = v;
    });
  }

  return { name, tags };
}

function formatPrometheusLabels(tags: Record<string, string>): string {
  if (Object.keys(tags).length === 0) return '';
  
  const labels = Object.entries(tags)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  
  return `{${labels}}`;
}
