# Operational Dashboards

This document describes the operational dashboards available for monitoring the AI Video Dubbing Platform.

## Overview

The platform provides five comprehensive Grafana dashboards for monitoring different aspects of the system:

1. **System Health Dashboard**: Overall system health and availability
2. **Job Processing Dashboard**: Job queue and processing metrics
3. **Model Performance Dashboard**: AI model inference and GPU metrics
4. **User Activity Dashboard**: User engagement and subscription metrics
5. **Cost & Performance Dashboard**: Infrastructure costs and optimization

## Dashboard Access

### Local Development

```bash
# Start Prometheus and Grafana
docker-compose up prometheus grafana

# Access Grafana
http://localhost:3000
# Default credentials: admin/admin
```

### Production (Kubernetes)

```bash
# Port forward Grafana service
kubectl port-forward -n monitoring svc/grafana 3000:80

# Access Grafana
http://localhost:3000
```

## 1. System Health Dashboard

**Purpose**: Monitor overall system health, availability, and resource usage.

### Key Metrics

- **API Uptime**: 24-hour uptime percentage
- **Database Status**: PostgreSQL connection status
- **Redis Status**: Redis connection status
- **Storage Status**: S3/GCS connection status
- **Active WebSocket Connections**: Real-time connection count

### Panels

1. **API Request Rate**: Requests per second by HTTP method
2. **API Response Time (p95)**: 95th percentile response time by endpoint
3. **Error Rate by Endpoint**: Errors per second by endpoint and status code
4. **Database Connection Pool**: Active vs. max connections
5. **Redis Memory Usage**: Memory usage percentage
6. **CPU Usage by Service**: CPU utilization by container
7. **Memory Usage by Service**: Memory usage by container
8. **Disk Usage**: Disk usage percentage by mount point

### Alerts

- API uptime < 99% (warning)
- API uptime < 95% (critical)
- Database connection failure (critical)
- Redis connection failure (critical)
- Disk usage > 80% (warning)
- Disk usage > 90% (critical)

### Use Cases

- **Incident Response**: Quickly identify service outages
- **Capacity Planning**: Monitor resource usage trends
- **Performance Optimization**: Identify slow endpoints

## 2. Job Processing Dashboard

**Purpose**: Monitor job queue depth, processing times, and worker utilization.

### Key Metrics

- **Jobs Processed (24h)**: Total jobs completed in last 24 hours
- **Jobs Failed (24h)**: Total jobs failed in last 24 hours
- **Success Rate**: Job success rate percentage
- **Average Processing Time**: Average job processing duration
- **Total Queue Depth**: Sum of all queue depths

### Panels

1. **Jobs Processed per Hour by Stage**: Job throughput by pipeline stage
2. **Queue Depth by Stage**: Current queue depth for each stage
3. **Processing Time by Stage**: p50, p95, p99 processing times
4. **Job Failure Rate by Stage**: Failures per second by stage
5. **Worker Utilization**: Worker capacity utilization percentage
6. **Job Throughput**: Jobs per minute by stage
7. **Failed Jobs by Error Type**: Pie chart of failure reasons
8. **Job Duration Distribution**: Heatmap of processing times

### Alerts

- Queue depth > 100 jobs (warning)
- Queue depth > 200 jobs (critical)
- Job failure rate > 5% (warning)
- Job failure rate > 10% (critical)
- Processing time > 2x average (warning)

### Use Cases

- **Capacity Planning**: Determine when to scale workers
- **Performance Tuning**: Identify slow pipeline stages
- **Error Analysis**: Understand common failure patterns

## 3. Model Performance Dashboard

**Purpose**: Monitor AI model inference performance, GPU utilization, and errors.

### Key Metrics

- **Total Inferences (24h)**: Total model inferences in last 24 hours
- **Average GPU Utilization**: Average GPU usage percentage
- **Model Error Rate**: Model inference error rate
- **Average Inference Time**: Average inference duration
- **Total GPU Memory Used**: Total GPU memory consumption

### Panels

1. **Inference Latency by Model (p95)**: 95th percentile latency by model
2. **GPU Utilization by Model**: GPU usage percentage by model
3. **Inference Rate by Model**: Inferences per second by model
4. **Model Memory Usage**: GPU memory usage by model
5. **Model Error Rate**: Errors per second by model
6. **Input Size Distribution**: Average input size by model
7. **GPU Temperature**: GPU temperature by device
8. **GPU Power Usage**: Power consumption by GPU
9. **Batch Size by Model**: Batch size by model
10. **Throughput**: Items processed per second by model

### Alerts

- GPU utilization > 90% for 5 minutes (warning)
- GPU temperature > 80°C (warning)
- GPU temperature > 85°C (critical)
- Model error rate > 1% (warning)
- Model error rate > 5% (critical)
- Inference latency > 10 seconds (warning)

### Use Cases

- **Performance Optimization**: Identify slow models
- **Resource Planning**: Determine GPU requirements
- **Quality Monitoring**: Track model error rates

## 4. User Activity & Subscription Dashboard

**Purpose**: Monitor user engagement, subscription metrics, and business KPIs.

### Key Metrics

- **Active Users (24h)**: Unique users in last 24 hours
- **New Projects (24h)**: Projects created in last 24 hours
- **Videos Processed (24h)**: Videos completed in last 24 hours
- **Processing Minutes Used (24h)**: Total processing time used
- **New Subscriptions (24h)**: New subscriptions in last 24 hours

### Panels

1. **Daily Active Users**: DAU trend over time
2. **Projects Created per Day**: Project creation trend
3. **Users by Subscription Tier**: Pie chart of user distribution
4. **Processing Minutes by Tier**: Processing usage by tier
5. **Subscription Conversions**: Upgrade/downgrade flows
6. **Subscription Cancellations**: Cancellation trend by tier
7. **Voice Clones Created**: Voice clone creation trend
8. **API Usage by Endpoint**: Request rate by endpoint
9. **User Retention (7-day)**: 7-day retention percentage
10. **Average Project Completion Time**: Average time to complete project

### Alerts

- DAU decrease > 20% week-over-week (warning)
- Subscription cancellation rate > 10% (warning)
- New subscriptions < 5 per day (warning)

### Use Cases

- **Business Metrics**: Track key business KPIs
- **User Engagement**: Monitor user activity trends
- **Revenue Optimization**: Analyze subscription patterns

## 5. Cost & Performance Dashboard

**Purpose**: Monitor infrastructure costs, GPU efficiency, and cost optimization opportunities.

### Key Metrics

- **Total Monthly Cost Projection**: Projected monthly infrastructure cost
- **Cost by Service**: Cost breakdown by service
- **GPU Utilization by Service**: GPU usage by service
- **Cost per Processing Minute**: Cost efficiency metric
- **Budget Utilization**: Percentage of budget used

### Panels

1. **Cost by Service**: Pie chart of cost distribution
2. **GPU Utilization by Service**: GPU usage by service
3. **Cost per Processing Minute**: Cost efficiency by service
4. **Budget Utilization**: Budget usage by service
5. **Queue Depth by Service**: Queue depth by service
6. **Jobs Processed per Hour**: Job throughput
7. **Cost per Job**: Cost per job by service
8. **GPU Memory Usage**: GPU memory by device
9. **Processing Time by Stage**: Processing time by stage
10. **Node Count by Type**: GPU node count by instance type
11. **Total GPU Hours (24h)**: Total GPU hours used

### Alerts

- Monthly cost projection > $20,000 (critical)
- Monthly cost projection > $15,000 (warning)
- Budget utilization > 90% (warning)
- GPU utilization < 50% for 1 hour (warning - underutilization)
- Cost per job > 2x average (warning)

### Use Cases

- **Cost Optimization**: Identify cost-saving opportunities
- **Budget Management**: Track spending against budget
- **Efficiency Analysis**: Optimize GPU utilization

## Dashboard Configuration

### Import Dashboards

```bash
# Import all dashboards
kubectl create configmap grafana-dashboards \
  --from-file=k8s/monitoring/ \
  -n monitoring

# Or import individually via Grafana UI
# Dashboard > Import > Upload JSON file
```

### Configure Data Sources

```yaml
# Prometheus data source
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Set Up Alerts

```yaml
# Alert notification channel (Slack example)
apiVersion: 1
notifiers:
  - name: slack-alerts
    type: slack
    uid: slack1
    settings:
      url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
      recipient: '#alerts'
      username: Grafana
```

## Best Practices

### 1. Dashboard Organization

- Use consistent naming conventions
- Group related panels together
- Use appropriate visualization types
- Set meaningful time ranges

### 2. Alert Configuration

- Set appropriate thresholds
- Avoid alert fatigue
- Use different severity levels
- Include actionable information

### 3. Performance

- Use appropriate time ranges
- Limit number of queries per panel
- Use query caching when possible
- Optimize Prometheus queries

### 4. Maintenance

- Review dashboards regularly
- Update thresholds based on trends
- Remove unused panels
- Document dashboard changes

## Troubleshooting

### Dashboard Not Loading

1. Check Grafana logs: `kubectl logs -n monitoring deployment/grafana`
2. Verify Prometheus connection: Test data source in Grafana
3. Check Prometheus metrics: `curl http://prometheus:9090/api/v1/query?query=up`

### Missing Metrics

1. Verify metric exporters are running
2. Check Prometheus targets: http://prometheus:9090/targets
3. Verify metric names in Prometheus: http://prometheus:9090/graph
4. Check service discovery configuration

### Slow Dashboard Performance

1. Reduce time range
2. Optimize Prometheus queries
3. Increase Grafana resources
4. Enable query caching

## Custom Dashboards

### Creating Custom Dashboards

1. **Clone Existing Dashboard**: Start with a similar dashboard
2. **Add Panels**: Use Grafana UI to add new panels
3. **Configure Queries**: Write Prometheus queries
4. **Set Thresholds**: Configure alert thresholds
5. **Export JSON**: Export dashboard JSON for version control

### Example Custom Panel

```json
{
  "title": "Custom Metric",
  "type": "graph",
  "targets": [
    {
      "expr": "your_custom_metric",
      "legendFormat": "{{label}}"
    }
  ],
  "yaxes": [
    {"format": "short", "label": "Value"}
  ]
}
```

## Integration with Alerting

### Grafana Alerts

Configure alerts directly in Grafana:

1. Edit panel
2. Click "Alert" tab
3. Configure alert conditions
4. Set notification channels

### Prometheus Alertmanager

For more complex alerting, use Prometheus Alertmanager:

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack'

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
```

## Maintenance Schedule

### Daily

- Review critical alerts
- Check system health dashboard
- Monitor job processing metrics

### Weekly

- Review cost dashboard
- Analyze user activity trends
- Check for anomalies

### Monthly

- Review and update alert thresholds
- Optimize dashboard queries
- Archive old dashboards
- Update documentation

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
