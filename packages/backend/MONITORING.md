# Production Monitoring and Observability

This document describes the monitoring and observability setup for the AI Video Dubbing Platform.

## Overview

The platform uses a comprehensive monitoring stack to ensure reliability, performance, and quick issue resolution:

- **Sentry**: Error tracking, performance monitoring, and alerting
- **Winston**: Structured logging with correlation IDs
- **DataDog APM**: Distributed tracing and application performance monitoring (optional)
- **Prometheus + Grafana**: Metrics collection and visualization (Kubernetes)

## Error Tracking with Sentry

### Configuration

Sentry is integrated across all services (backend, frontend, workers) for comprehensive error tracking.

**Environment Variables:**
```bash
# Backend & Workers
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

### Features

1. **Automatic Error Capture**: All unhandled exceptions are automatically captured
2. **Performance Monitoring**: API endpoint response times and database query performance
3. **Breadcrumbs**: Detailed event trail leading up to errors
4. **User Context**: Errors are tagged with user IDs for easier debugging
5. **Sensitive Data Filtering**: Passwords, tokens, and API keys are automatically redacted

### Usage Examples

**Backend:**
```typescript
import { captureException, captureMessage, addBreadcrumb } from './lib/sentry';

// Capture an exception with context
try {
  await processVideo(videoId);
} catch (error) {
  captureException(error, {
    videoId,
    userId,
    stage: 'stt',
  });
  throw error;
}

// Capture a message
captureMessage('Video processing started', 'info', {
  projectId,
  duration: videoDuration,
});

// Add breadcrumb for debugging
addBreadcrumb('Video uploaded', 'video', 'info', {
  size: fileSize,
  format: fileFormat,
});
```

**Frontend:**
```typescript
import * as Sentry from '@sentry/nextjs';

// Capture exception
try {
  await uploadVideo(file);
} catch (error) {
  Sentry.captureException(error);
}

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
});
```

### Alert Rules

Configure alerts in Sentry dashboard for:

1. **Critical Errors**: Any error with status >= 500
2. **High Error Rate**: More than 10 errors per minute
3. **Performance Degradation**: API response time > 2 seconds
4. **Failed Jobs**: Worker job failures exceeding threshold

### Error Grouping

Sentry automatically groups similar errors. Configure custom grouping rules for:
- Model inference failures by model type
- Database connection errors
- Storage service errors
- Queue processing errors

## Structured Logging

### Winston Configuration

Winston is configured for structured JSON logging with correlation IDs for request tracing.

**Log Levels:**
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions that should be reviewed
- `info`: Informational messages about normal operations
- `debug`: Detailed debugging information (development only)

**Log Format:**
```json
{
  "timestamp": "2024-11-04T10:30:45.123Z",
  "level": "info",
  "message": "Video processing started",
  "correlationId": "req-abc123",
  "userId": "user-xyz789",
  "projectId": "proj-456",
  "stage": "stt",
  "duration": 125.5
}
```

### Correlation IDs

Every request is assigned a unique correlation ID that flows through all services:

```typescript
// Middleware adds correlation ID to request
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Use in logs
logger.info('Processing video', {
  correlationId: req.correlationId,
  projectId,
});
```

### Log Aggregation

**Development:**
- Logs output to console in human-readable format

**Production:**
- Logs sent to DataDog or ELK stack
- Retention: 30 days for all logs, 90 days for errors
- Searchable by correlation ID, user ID, project ID, stage

## Application Performance Monitoring (APM)

### DataDog APM Setup (Optional)

Install DataDog agent:
```bash
npm install dd-trace
```

Initialize in application:
```typescript
// Must be first import
import tracer from 'dd-trace';
tracer.init({
  service: 'dubbing-backend',
  env: process.env.NODE_ENV,
  logInjection: true,
});
```

### Metrics Tracked

**API Metrics:**
- Request rate (requests per second)
- Response time (p50, p95, p99)
- Error rate (percentage)
- Throughput (requests per minute)

**Database Metrics:**
- Query execution time
- Connection pool usage
- Slow queries (> 1 second)
- Transaction rollback rate

**Job Queue Metrics:**
- Queue depth by stage
- Job processing time by stage
- Job failure rate
- Worker utilization

**WebSocket Metrics:**
- Active connections
- Message latency
- Connection errors
- Reconnection rate

**Model Inference Metrics:**
- Inference latency by model
- GPU utilization
- Model memory usage
- Batch size efficiency

## Operational Dashboards

### 1. System Health Dashboard

**Metrics:**
- API uptime and availability
- Database connection status
- Redis connection status
- Storage service status
- Active WebSocket connections

**Alerts:**
- Service downtime > 1 minute
- Database connection failures
- Redis connection failures

### 2. Job Processing Dashboard

**Metrics:**
- Jobs processed per hour by stage
- Average processing time by stage
- Job failure rate by stage
- Queue depth by stage
- Worker utilization

**Alerts:**
- Queue depth > 100 jobs
- Job failure rate > 5%
- Processing time > 2x average

### 3. Model Performance Dashboard

**Metrics:**
- Inference latency by model (p50, p95, p99)
- GPU utilization by model
- Model memory usage
- Requests per second by model
- Error rate by model

**Alerts:**
- Inference latency > 10 seconds
- GPU utilization > 90%
- Model error rate > 1%

### 4. User Activity Dashboard

**Metrics:**
- Active users (daily, weekly, monthly)
- Projects created per day
- Videos processed per day
- Processing minutes used by tier
- Subscription conversions

**Alerts:**
- Unusual spike in activity (potential abuse)
- Subscription cancellation rate > 10%

### 5. Error Rate Dashboard

**Metrics:**
- Error rate by endpoint
- Error rate by stage
- Error rate by model
- Top error types
- Error resolution time

**Alerts:**
- Error rate > 1% for any endpoint
- New error type detected
- Unresolved errors > 1 hour

## Kubernetes Monitoring

### Prometheus Metrics

The platform exposes Prometheus metrics for Kubernetes monitoring:

**Endpoint:** `GET /metrics`

**Metrics Exposed:**
- `http_requests_total`: Total HTTP requests by method and status
- `http_request_duration_seconds`: HTTP request duration histogram
- `job_processing_duration_seconds`: Job processing duration by stage
- `queue_depth`: Current queue depth by stage
- `active_websocket_connections`: Number of active WebSocket connections
- `model_inference_duration_seconds`: Model inference duration by model

### Grafana Dashboards

Pre-configured Grafana dashboards are available in `k8s/monitoring/grafana-dashboards.json`:

1. **Platform Overview**: High-level system health and metrics
2. **Job Processing**: Detailed job queue and processing metrics
3. **Model Performance**: Model inference and GPU utilization
4. **Cost Tracking**: Processing costs by model and tier

## Alert Configuration

### Critical Alerts (PagerDuty/Slack)

- API downtime > 1 minute
- Database connection failure
- Redis connection failure
- Job failure rate > 10%
- GPU out of memory errors

### Warning Alerts (Email/Slack)

- API response time > 2 seconds
- Queue depth > 100 jobs
- Error rate > 1%
- GPU utilization > 90%
- Disk usage > 80%

### Info Alerts (Email)

- Daily processing summary
- Weekly cost report
- Monthly user activity report

## Best Practices

### 1. Error Handling

Always capture errors with relevant context:
```typescript
try {
  await processVideo(videoId);
} catch (error) {
  captureException(error, {
    videoId,
    userId,
    stage: 'stt',
    modelVersion: 'whisper-large-v3',
  });
  throw error;
}
```

### 2. Performance Monitoring

Use transactions for critical operations:
```typescript
const transaction = startTransaction('video-processing', 'job');
try {
  await processVideo(videoId);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

### 3. Logging

Use structured logging with correlation IDs:
```typescript
logger.info('Video processing started', {
  correlationId: req.correlationId,
  projectId,
  userId,
  duration: videoDuration,
});
```

### 4. Breadcrumbs

Add breadcrumbs for important events:
```typescript
addBreadcrumb('Video uploaded', 'video', 'info', {
  size: fileSize,
  format: fileFormat,
});
```

### 5. User Context

Set user context for better error tracking:
```typescript
setUserContext({
  id: user.id,
  email: user.email,
});
```

## Troubleshooting

### High Error Rate

1. Check Sentry dashboard for error patterns
2. Review logs for correlation IDs
3. Check system health dashboard
4. Verify external service status (models, storage)

### Slow Performance

1. Check APM dashboard for slow endpoints
2. Review database slow query log
3. Check GPU utilization metrics
4. Verify queue depth and worker utilization

### Job Failures

1. Check job processing dashboard
2. Review worker logs with correlation ID
3. Check model service health
4. Verify storage service connectivity

## Security Considerations

1. **Sensitive Data**: All passwords, tokens, and API keys are automatically redacted
2. **User Privacy**: User emails are only included in error context, not in public logs
3. **Access Control**: Monitoring dashboards require authentication
4. **Data Retention**: Logs and metrics are retained according to compliance requirements

## Cost Optimization

1. **Sampling**: Production uses 10% sampling for traces and profiles
2. **Log Levels**: Production uses `info` level, development uses `debug`
3. **Retention**: Logs retained for 30 days, errors for 90 days
4. **Aggregation**: Metrics aggregated to reduce storage costs

## Next Steps

1. Configure Sentry DSN in environment variables
2. Set up alert rules in Sentry dashboard
3. Configure DataDog APM (optional)
4. Deploy Prometheus and Grafana to Kubernetes
5. Set up alert channels (PagerDuty, Slack, Email)
6. Create runbooks for common issues
