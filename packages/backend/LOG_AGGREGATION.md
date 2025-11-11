# Log Aggregation Configuration

This document describes how to configure log aggregation for the AI Video Dubbing Platform.

## Overview

The platform uses Winston for structured logging with support for multiple log aggregation backends:

- **DataDog Logs**: Cloud-based log management (recommended for production)
- **ELK Stack**: Self-hosted Elasticsearch, Logstash, Kibana
- **CloudWatch Logs**: AWS native log aggregation
- **File-based**: Local file storage with rotation (development/fallback)

## Log Format

All logs are structured in JSON format with the following fields:

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

## Correlation IDs

Every request is assigned a unique correlation ID that flows through all services:

- Generated automatically for new requests
- Can be provided via `X-Correlation-ID` header
- Included in all logs and error reports
- Used to trace requests across services

## DataDog Logs Integration

### Installation

```bash
npm install winston-datadog-logs
```

### Configuration

Add to `packages/backend/src/lib/logger.ts`:

```typescript
import { DatadogTransport } from 'winston-datadog-logs';

// Add DataDog transport
if (process.env.DD_API_KEY) {
  transports.push(
    new DatadogTransport({
      apiKey: process.env.DD_API_KEY,
      hostname: process.env.DD_HOSTNAME || 'dubbing-backend',
      service: 'dubbing-backend',
      ddsource: 'nodejs',
      ddtags: `env:${process.env.NODE_ENV}`,
    })
  );
}
```

### Environment Variables

```bash
DD_API_KEY=your-datadog-api-key
DD_HOSTNAME=dubbing-backend
DD_SITE=datadoghq.com  # or datadoghq.eu for EU
```

### Features

- Automatic log ingestion
- Full-text search
- Log correlation with APM traces
- Custom dashboards and alerts
- 15-day retention (configurable)

## ELK Stack Integration

### Installation

```bash
npm install winston-elasticsearch
```

### Configuration

Add to `packages/backend/src/lib/logger.ts`:

```typescript
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Add Elasticsearch transport
if (process.env.ELASTICSEARCH_URL) {
  transports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
      },
      index: 'dubbing-logs',
    })
  );
}
```

### Environment Variables

```bash
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

## AWS CloudWatch Logs

### Installation

```bash
npm install winston-cloudwatch
```

### Configuration

Add to `packages/backend/src/lib/logger.ts`:

```typescript
import WinstonCloudWatch from 'winston-cloudwatch';

// Add CloudWatch transport
if (process.env.AWS_CLOUDWATCH_LOG_GROUP) {
  transports.push(
    new WinstonCloudWatch({
      logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
      logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION,
      jsonMessage: true,
    })
  );
}
```

### Environment Variables

```bash
AWS_CLOUDWATCH_LOG_GROUP=/dubbing-platform/backend
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Log Levels

The platform uses the following log levels:

- **error**: Critical errors requiring immediate attention
  - Application crashes
  - Database connection failures
  - Model inference failures
  - Payment processing errors

- **warn**: Warning conditions that should be reviewed
  - Slow database queries (> 1 second)
  - Rate limit exceeded
  - Low confidence transcriptions
  - Deprecated API usage

- **info**: Informational messages about normal operations
  - Request/response logging
  - Job processing events
  - User authentication events
  - Configuration changes

- **debug**: Detailed debugging information (development only)
  - Database query details
  - Model inference parameters
  - Cache hit/miss events
  - Internal state changes

## Log Retention

### Development
- Console output only
- No retention policy

### Production
- **All logs**: 30 days
- **Error logs**: 90 days
- **Audit logs**: 1 year
- **Compliance logs**: 7 years (if required)

## Searching Logs

### By Correlation ID

```bash
# DataDog
correlationId:req-abc123

# Elasticsearch
GET /dubbing-logs/_search
{
  "query": {
    "match": {
      "correlationId": "req-abc123"
    }
  }
}
```

### By User ID

```bash
# DataDog
userId:user-xyz789

# Elasticsearch
GET /dubbing-logs/_search
{
  "query": {
    "match": {
      "userId": "user-xyz789"
    }
  }
}
```

### By Time Range

```bash
# DataDog
@timestamp:[2024-11-04T00:00:00 TO 2024-11-04T23:59:59]

# Elasticsearch
GET /dubbing-logs/_search
{
  "query": {
    "range": {
      "timestamp": {
        "gte": "2024-11-04T00:00:00",
        "lte": "2024-11-04T23:59:59"
      }
    }
  }
}
```

### By Error Type

```bash
# DataDog
level:error AND error.name:DatabaseError

# Elasticsearch
GET /dubbing-logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "match": { "error.name": "DatabaseError" } }
      ]
    }
  }
}
```

## Log Alerts

### Critical Error Alert

Trigger when error rate exceeds threshold:

```yaml
# DataDog Monitor
name: "High Error Rate"
type: "log alert"
query: "status:error"
message: "Error rate exceeded 10 errors per minute"
thresholds:
  critical: 10
  warning: 5
time_aggregator: "count"
timeframe: "last_1m"
```

### Slow Query Alert

Trigger when slow queries detected:

```yaml
# DataDog Monitor
name: "Slow Database Queries"
type: "log alert"
query: "operation:database AND duration:>1000"
message: "Slow database query detected (>1s)"
thresholds:
  critical: 5
  warning: 2
time_aggregator: "count"
timeframe: "last_5m"
```

### Failed Job Alert

Trigger when job failures exceed threshold:

```yaml
# DataDog Monitor
name: "High Job Failure Rate"
type: "log alert"
query: "status:failed AND stage:*"
message: "Job failure rate exceeded 5%"
thresholds:
  critical: 10
  warning: 5
time_aggregator: "count"
timeframe: "last_15m"
```

## Best Practices

### 1. Use Structured Logging

Always use structured logging with context:

```typescript
logger.info('Video processing started', {
  projectId,
  userId,
  duration: videoDuration,
  format: videoFormat,
});
```

### 2. Include Correlation IDs

Always include correlation IDs for request tracing:

```typescript
logger.info('Processing video', {
  correlationId: req.correlationId,
  projectId,
});
```

### 3. Log at Appropriate Levels

- Use `error` for failures requiring attention
- Use `warn` for potential issues
- Use `info` for normal operations
- Use `debug` for detailed debugging (development only)

### 4. Avoid Logging Sensitive Data

Never log:
- Passwords
- API keys
- JWT tokens
- Credit card numbers
- Personal identification numbers

### 5. Use Child Loggers

Create child loggers with default context:

```typescript
const jobLogger = createChildLogger({
  jobId,
  stage: 'stt',
});

jobLogger.info('Job started');
jobLogger.error('Job failed', { error: error.message });
```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify transport configuration
3. Check network connectivity to log aggregation service
4. Review transport error logs

### High Log Volume

1. Increase log level to `info` or `warn`
2. Implement log sampling for high-frequency events
3. Use log aggregation filters
4. Optimize log retention policies

### Missing Correlation IDs

1. Verify correlation ID middleware is installed
2. Check middleware order (should be early in chain)
3. Ensure correlation ID is passed between services

## Performance Considerations

### Log Buffering

Winston buffers logs before sending to transports. Configure buffer size:

```typescript
new DatadogTransport({
  // ... other options
  bufferSize: 100,  // Send logs in batches of 100
});
```

### Async Logging

Use async transports to avoid blocking:

```typescript
const transport = new winston.transports.File({
  filename: 'logs/combined.log',
  lazy: true,  // Open file lazily
});
```

### Log Sampling

Sample high-frequency logs in production:

```typescript
const shouldLog = Math.random() < 0.1;  // 10% sampling
if (shouldLog) {
  logger.debug('High frequency event', { data });
}
```

## Security Considerations

1. **Access Control**: Restrict log access to authorized personnel
2. **Encryption**: Use TLS for log transmission
3. **Redaction**: Automatically redact sensitive data
4. **Audit Logs**: Maintain separate audit logs for compliance
5. **Retention**: Follow data retention policies

## Cost Optimization

1. **Log Levels**: Use appropriate log levels to reduce volume
2. **Sampling**: Sample debug logs in production
3. **Retention**: Implement tiered retention policies
4. **Compression**: Enable log compression for storage
5. **Filtering**: Filter out noisy logs at source
