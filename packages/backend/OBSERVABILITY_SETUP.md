# Production Monitoring and Observability Setup

This document provides a comprehensive guide to the monitoring and observability implementation for the AI Video Dubbing Platform.

## Overview

The platform implements a complete observability stack with:

- **Error Tracking**: Sentry for error capture and performance monitoring
- **Metrics Collection**: Custom metrics with Prometheus export
- **Structured Logging**: Winston with correlation IDs
- **Operational Dashboards**: Grafana dashboards for visualization
- **Alerting**: Configurable alerts for critical issues

## Quick Start

### 1. Configure Environment Variables

```bash
# Backend (.env)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
NODE_ENV=production
LOG_LEVEL=info

# Frontend (.env)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Workers (.env)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

### 2. Install Dependencies

All required dependencies are already installed:
- `@sentry/node` - Backend error tracking
- `@sentry/nextjs` - Frontend error tracking
- `winston` - Structured logging
- `uuid` - Correlation ID generation

### 3. Start Services

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Access Monitoring

- **Sentry Dashboard**: https://sentry.io/organizations/your-org/projects/
- **Metrics Endpoint**: http://localhost:3001/api/metrics
- **Prometheus Metrics**: http://localhost:3001/api/metrics/prometheus
- **Grafana Dashboards**: http://localhost:3000 (if running locally)

## Components

### 1. Error Tracking (Sentry)

**Files:**
- `packages/backend/src/lib/sentry.ts` - Backend Sentry configuration
- `packages/frontend/sentry.client.config.ts` - Frontend client config
- `packages/frontend/sentry.server.config.ts` - Frontend server config
- `packages/workers/src/lib/sentry.ts` - Workers Sentry configuration

**Features:**
- Automatic error capture
- Performance monitoring (10% sampling in production)
- Profiling (10% sampling in production)
- Sensitive data filtering
- User context tracking
- Breadcrumbs for debugging

**Usage:**
```typescript
import { captureException, captureMessage, addBreadcrumb } from './lib/sentry';

// Capture exception
try {
  await processVideo(videoId);
} catch (error) {
  captureException(error, { videoId, userId });
  throw error;
}

// Capture message
captureMessage('Video processing started', 'info', { projectId });

// Add breadcrumb
addBreadcrumb('Video uploaded', 'video', 'info', { size: fileSize });
```

### 2. Metrics Collection

**Files:**
- `packages/backend/src/lib/metrics.ts` - Metrics collection module
- `packages/backend/src/routes/metrics.ts` - Metrics API endpoints

**Features:**
- Counter metrics (incremental values)
- Gauge metrics (point-in-time values)
- Histogram metrics (distributions)
- Prometheus export format
- Automatic HTTP request tracking

**Metrics Tracked:**
- HTTP requests (rate, duration, errors)
- Job processing (started, completed, failed, duration)
- WebSocket connections (active, messages)
- Database queries (duration, errors)
- Model inference (duration, errors, GPU usage)

**Usage:**
```typescript
import { metrics, JobMetrics, ModelMetrics } from './lib/metrics';

// Track job processing
JobMetrics.recordJobStart('stt', jobId);
JobMetrics.recordJobComplete('stt', jobId, duration);

// Track model inference
ModelMetrics.recordInference('whisper', duration, true, inputSize);
ModelMetrics.recordGPUUtilization('whisper', 85);
```

**Endpoints:**
- `GET /api/metrics` - JSON format (requires auth)
- `GET /api/metrics/prometheus` - Prometheus format (public)
- `POST /api/metrics/reset` - Reset metrics (requires auth)

### 3. Structured Logging

**Files:**
- `packages/backend/src/lib/logger.ts` - Backend logger configuration
- `packages/workers/src/lib/logger.ts` - Workers logger configuration

**Features:**
- Structured JSON logging
- Correlation IDs for request tracing
- Multiple log levels (error, warn, info, debug)
- File rotation in production
- Console output in development
- Log aggregation support (DataDog, ELK, CloudWatch)

**Log Format:**
```json
{
  "timestamp": "2024-11-04T10:30:45.123Z",
  "level": "info",
  "message": "Video processing started",
  "correlationId": "req-abc123",
  "userId": "user-xyz789",
  "projectId": "proj-456",
  "stage": "stt"
}
```

**Usage:**
```typescript
import { logger, logJobProcessing, logError } from './lib/logger';

// Basic logging
logger.info('Processing video', { projectId, userId });

// Job processing
logJobProcessing('stt', jobId, 'started', { duration });

// Error logging
logError(error, { projectId, stage: 'stt' });
```

**Correlation IDs:**
Every request automatically gets a correlation ID that flows through all logs:
- Generated automatically or from `X-Correlation-ID` header
- Included in all logs
- Returned in response headers
- Used for distributed tracing

### 4. Operational Dashboards

**Files:**
- `k8s/monitoring/system-health-dashboard.json` - System health metrics
- `k8s/monitoring/job-processing-dashboard.json` - Job queue metrics
- `k8s/monitoring/model-performance-dashboard.json` - Model inference metrics
- `k8s/monitoring/user-activity-dashboard.json` - User engagement metrics
- `k8s/monitoring/grafana-dashboards.json` - Cost and performance metrics

**Dashboards:**

1. **System Health Dashboard**
   - API uptime and availability
   - Database/Redis/Storage status
   - Resource usage (CPU, memory, disk)
   - WebSocket connections

2. **Job Processing Dashboard**
   - Jobs processed/failed
   - Queue depth by stage
   - Processing times (p50, p95, p99)
   - Worker utilization

3. **Model Performance Dashboard**
   - Inference latency by model
   - GPU utilization and memory
   - Model error rates
   - Throughput metrics

4. **User Activity Dashboard**
   - Active users (DAU, WAU, MAU)
   - Projects and videos processed
   - Subscription metrics
   - User retention

5. **Cost & Performance Dashboard**
   - Monthly cost projection
   - Cost by service
   - GPU efficiency
   - Budget utilization

**Import Dashboards:**
```bash
# Via Grafana UI
Dashboard > Import > Upload JSON file

# Via Kubernetes ConfigMap
kubectl create configmap grafana-dashboards \
  --from-file=k8s/monitoring/ \
  -n monitoring
```

## Alert Configuration

### Sentry Alerts

Configure in Sentry dashboard:

1. **Critical Errors**: Status >= 500
2. **High Error Rate**: > 10 errors/minute
3. **Performance Degradation**: Response time > 2 seconds
4. **Failed Jobs**: Failure rate > 5%

### Grafana Alerts

Configure in Grafana dashboards:

1. **System Health**
   - API uptime < 99%
   - Database connection failure
   - Disk usage > 80%

2. **Job Processing**
   - Queue depth > 100 jobs
   - Job failure rate > 5%
   - Processing time > 2x average

3. **Model Performance**
   - GPU utilization > 90%
   - GPU temperature > 80°C
   - Model error rate > 1%

4. **User Activity**
   - DAU decrease > 20% WoW
   - Subscription cancellation rate > 10%

## Log Aggregation

### DataDog (Recommended)

```bash
npm install winston-datadog-logs
```

```typescript
// Add to logger.ts
import { DatadogTransport } from 'winston-datadog-logs';

transports.push(
  new DatadogTransport({
    apiKey: process.env.DD_API_KEY,
    hostname: 'dubbing-backend',
    service: 'dubbing-backend',
  })
);
```

### ELK Stack

```bash
npm install winston-elasticsearch
```

```typescript
// Add to logger.ts
import { ElasticsearchTransport } from 'winston-elasticsearch';

transports.push(
  new ElasticsearchTransport({
    clientOpts: { node: process.env.ELASTICSEARCH_URL },
    index: 'dubbing-logs',
  })
);
```

### AWS CloudWatch

```bash
npm install winston-cloudwatch
```

```typescript
// Add to logger.ts
import WinstonCloudWatch from 'winston-cloudwatch';

transports.push(
  new WinstonCloudWatch({
    logGroupName: '/dubbing-platform/backend',
    awsRegion: process.env.AWS_REGION,
  })
);
```

## Performance Monitoring (Optional)

### DataDog APM

```bash
npm install dd-trace
```

```typescript
// Add to top of index.ts (before any other imports)
import tracer from 'dd-trace';
tracer.init({
  service: 'dubbing-backend',
  env: process.env.NODE_ENV,
});
```

## Best Practices

### 1. Error Handling

Always capture errors with context:
```typescript
try {
  await processVideo(videoId);
} catch (error) {
  captureException(error, { videoId, userId, stage: 'stt' });
  logError(error, { videoId, userId, stage: 'stt' });
  throw error;
}
```

### 2. Logging

Use appropriate log levels:
- `error`: Critical failures requiring immediate attention
- `warn`: Potential issues that should be reviewed
- `info`: Normal operations and important events
- `debug`: Detailed debugging information (development only)

### 3. Metrics

Track key business and technical metrics:
```typescript
// Business metrics
metrics.incrementCounter('videos.processed', 1, { tier: 'pro' });

// Technical metrics
metrics.recordHistogram('api.response.time', duration, { endpoint: '/api/projects' });
```

### 4. Correlation IDs

Always include correlation IDs for request tracing:
```typescript
logger.info('Processing video', {
  correlationId: req.correlationId,
  projectId,
});
```

### 5. Sensitive Data

Never log sensitive information:
- Passwords
- API keys
- JWT tokens
- Credit card numbers
- Personal identification numbers

## Troubleshooting

### Sentry Not Capturing Errors

1. Verify `SENTRY_DSN` is set
2. Check Sentry initialization in logs
3. Test with manual error: `captureException(new Error('Test'))`
4. Check Sentry dashboard for events

### Metrics Not Appearing

1. Verify metrics endpoint: `curl http://localhost:3001/api/metrics`
2. Check Prometheus scraping: `curl http://localhost:3001/api/metrics/prometheus`
3. Verify Prometheus targets in Prometheus UI

### Logs Not Appearing

1. Check log level configuration
2. Verify log transport configuration
3. Check file permissions (production)
4. Test with manual log: `logger.info('Test')`

### Dashboards Not Loading

1. Check Grafana logs
2. Verify Prometheus data source
3. Test Prometheus queries manually
4. Check dashboard JSON syntax

## Monitoring Checklist

### Daily
- [ ] Review critical alerts
- [ ] Check system health dashboard
- [ ] Monitor job processing metrics
- [ ] Review error rates

### Weekly
- [ ] Review cost dashboard
- [ ] Analyze user activity trends
- [ ] Check for performance anomalies
- [ ] Review slow queries

### Monthly
- [ ] Update alert thresholds
- [ ] Optimize dashboard queries
- [ ] Review log retention
- [ ] Update documentation

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [MONITORING.md](./MONITORING.md) - Detailed monitoring guide
- [LOG_AGGREGATION.md](./LOG_AGGREGATION.md) - Log aggregation setup
- [k8s/monitoring/DASHBOARDS.md](../../k8s/monitoring/DASHBOARDS.md) - Dashboard guide

## Support

For issues or questions:
1. Check documentation in this directory
2. Review Sentry dashboard for errors
3. Check Grafana dashboards for metrics
4. Review logs with correlation IDs
5. Contact platform team
