# Deployment Monitoring and Alerting

This guide covers monitoring and alerting for deployments in the AI Video Dubbing Platform.

## Overview

Comprehensive deployment monitoring ensures:
- Early detection of deployment issues
- Automated rollback on critical failures
- Real-time visibility into deployment health
- Post-deployment validation
- Incident response coordination

## Monitoring Components

### 1. Prometheus Alerts

Alert rules are defined in `deployment-alerts.yaml` and monitor:
- Deployment status and progress
- Pod health and restarts
- Error rates and response times
- Resource usage
- Database migrations
- HPA scaling

### 2. Grafana Dashboard

The deployment dashboard (`deployment-dashboard.json`) provides:
- Real-time deployment status
- Rollout progress tracking
- Error rate trends
- Response time metrics
- Blue-green deployment status
- Resource utilization

### 3. Automated Rollback

Automated rollback system (`rollback-automation.yaml`) triggers on:
- Critical error rate (>10% for 5 minutes)
- Severe latency (P95 >5 seconds)
- Pod crash loops
- Database connection failures

## Setup

### Install Monitoring Stack

```bash
# Apply Prometheus alert rules
kubectl apply -f deployment-alerts.yaml

# Import Grafana dashboard
# Go to Grafana > Dashboards > Import
# Upload deployment-dashboard.json

# Deploy rollback automation
kubectl apply -f rollback-automation.yaml

# Create notification secrets
kubectl create secret generic notification-secrets \
  --from-literal=slack-webhook-url=$SLACK_WEBHOOK_URL \
  --from-literal=pagerduty-api-key=$PAGERDUTY_API_KEY \
  --from-literal=pagerduty-service-id=$PAGERDUTY_SERVICE_ID \
  -n monitoring
```

### Configure Alertmanager

```yaml
# alertmanager-config.yaml
global:
  slack_api_url: $SLACK_WEBHOOK_URL

route:
  group_by: ['alertname', 'namespace']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'deployment-alerts'
  routes:
  - match:
      severity: critical
      category: deployment
    receiver: 'pagerduty-critical'
  - match:
      severity: warning
      category: deployment
    receiver: 'slack-warnings'

receivers:
- name: 'deployment-alerts'
  slack_configs:
  - channel: '#deployments'
    title: 'Deployment Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: $PAGERDUTY_SERVICE_KEY
    description: '{{ .CommonAnnotations.summary }}'

- name: 'slack-warnings'
  slack_configs:
  - channel: '#deployment-warnings'
    title: 'Deployment Warning'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Monitoring During Deployment

### Pre-Deployment Checklist

- [ ] Monitoring dashboards open
- [ ] Alert channels active
- [ ] On-call engineer available
- [ ] Rollback plan documented
- [ ] Baseline metrics captured

### Key Metrics to Watch

#### 1. Error Rate

```promql
# Overall error rate
sum(rate(http_requests_total{status=~"5..",namespace="production"}[5m]))
/
sum(rate(http_requests_total{namespace="production"}[5m]))
* 100

# By deployment
sum(rate(http_requests_total{status=~"5.."}[5m])) by (deployment)
/
sum(rate(http_requests_total[5m])) by (deployment)
* 100
```

**Thresholds**:
- Normal: <1%
- Warning: 1-5%
- Critical: >5%
- Rollback: >10%

#### 2. Response Time

```promql
# P95 response time
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, deployment)
)

# P99 response time
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, deployment)
)
```

**Thresholds**:
- Normal: P95 <500ms, P99 <2s
- Warning: P95 <2s, P99 <5s
- Critical: P95 >2s, P99 >5s
- Rollback: P95 >5s

#### 3. Pod Health

```promql
# Pod restart rate
rate(kube_pod_container_status_restarts_total[10m])

# Pods not ready
sum(kube_pod_status_phase{phase=~"Pending|Unknown|Failed"}) by (namespace, pod)

# Deployment replica status
kube_deployment_status_replicas_available
```

**Thresholds**:
- Normal: 0 restarts, all pods ready
- Warning: <0.1 restarts/min
- Critical: >0.5 restarts/min
- Rollback: Crash loop detected

#### 4. Resource Usage

```promql
# Memory usage
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100

# CPU usage
rate(container_cpu_usage_seconds_total[5m]) / container_spec_cpu_quota * 100
```

**Thresholds**:
- Normal: <70%
- Warning: 70-90%
- Critical: >90%

#### 5. Database Connections

```promql
# Active connections
pg_stat_database_numbackends

# Connection errors
rate(database_connection_errors_total[5m])
```

**Thresholds**:
- Normal: <80% of max connections, 0 errors
- Warning: 80-95% of max connections
- Critical: >95% or connection errors

### Monitoring Timeline

**0-5 minutes**: Initial deployment
- Watch pod startup
- Check health probes
- Monitor resource allocation

**5-15 minutes**: Stabilization
- Monitor error rates
- Check response times
- Verify database connections
- Watch for memory leaks

**15-30 minutes**: Validation
- Compare metrics to baseline
- Check for gradual degradation
- Verify auto-scaling behavior
- Monitor queue depths

**30+ minutes**: Steady state
- Continue monitoring at normal intervals
- Document any anomalies
- Update runbooks if needed

## Alert Response

### Alert Severity Levels

#### Critical Alerts

Require immediate action, may trigger automated rollback:
- DeploymentFailed
- PodCrashLooping
- ErrorRateSpikeAfterDeployment
- DatabaseMigrationFailed
- ImagePullBackOff

**Response**:
1. Acknowledge alert immediately
2. Assess impact (check dashboard)
3. Decide: rollback or investigate
4. Execute decision within 5 minutes
5. Notify team in #production-incidents

#### Warning Alerts

Require investigation but not immediate action:
- DeploymentReplicasMismatch
- PodNotReady
- ResponseTimeDegradation
- HighMemoryAfterDeployment
- RolloutStuck

**Response**:
1. Acknowledge alert
2. Review metrics and logs
3. Determine if intervention needed
4. Document findings
5. Create ticket if needed

### Automated Rollback

The system automatically triggers rollback when:

1. **Error rate >10%** for 5 minutes
2. **P95 latency >5s** for 5 minutes
3. **Pod crash loop** detected
4. **Database connection failures** >10/min

**Rollback Process**:
```bash
# For blue-green deployments
1. Switch service selector to blue
2. Scale down green deployment
3. Send notifications
4. Create incident

# For standard deployments
1. Execute kubectl rollout undo
2. Wait for rollback completion
3. Send notifications
4. Create incident
```

**Manual Rollback**:
```bash
# Trigger manual rollback
kubectl create job --from=job/rollback-job-template \
  rollback-$(date +%s) \
  -n monitoring

# Or use the script directly
kubectl exec -it deployment/monitoring -n monitoring -- \
  /scripts/rollback.sh production backend-green "Manual rollback due to high error rate"
```

## Post-Deployment Validation

### Automated Checks

The CI/CD pipeline runs these checks after deployment:

1. **Health endpoint check**
   ```bash
   curl -f https://api.dubbing-platform.example.com/health
   ```

2. **Smoke tests**
   ```bash
   # Run critical path tests
   npm run test:smoke
   ```

3. **Metric validation**
   - Error rate <1%
   - P95 response time <500ms
   - All pods ready
   - No crash loops

### Manual Validation

After deployment, verify:

- [ ] All services responding
- [ ] Database migrations applied
- [ ] Queue processing working
- [ ] WebSocket connections stable
- [ ] File uploads working
- [ ] Model services accessible
- [ ] No errors in Sentry
- [ ] Metrics look normal

### Validation Queries

```bash
# Check deployment status
kubectl get deployments -n production

# Check pod health
kubectl get pods -n production

# Check recent errors in logs
kubectl logs -l app=backend -n production --since=15m | grep ERROR

# Check Sentry for new errors
# Visit Sentry dashboard

# Check DataDog for anomalies
# Visit DataDog APM dashboard

# Test API endpoints
curl https://api.dubbing-platform.example.com/health
curl https://api.dubbing-platform.example.com/api/models
```

## Troubleshooting

### High Error Rate

**Symptoms**: Error rate >5% after deployment

**Investigation**:
```bash
# Check application logs
kubectl logs -f deployment/backend-green -n production | grep ERROR

# Check Sentry for error details
# Visit Sentry dashboard

# Check database connections
kubectl exec -it deployment/backend-green -n production -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis connectivity
kubectl exec -it deployment/backend-green -n production -- \
  redis-cli -h redis-service ping
```

**Resolution**:
- If application error: Rollback and fix
- If database issue: Check connections and migrations
- If external service: Check service health

### Slow Response Times

**Symptoms**: P95 >2s after deployment

**Investigation**:
```bash
# Check resource usage
kubectl top pods -n production

# Check database query performance
kubectl exec -it postgres-pod -n production -- \
  psql -U postgres -d dubbing_prod -c "
    SELECT query, mean_exec_time, calls
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 10;
  "

# Check for N+1 queries in logs
kubectl logs deployment/backend-green -n production | grep "Query"
```

**Resolution**:
- Scale up if resource constrained
- Optimize slow queries
- Add caching if needed
- Rollback if critical

### Pod Crashes

**Symptoms**: Pods restarting frequently

**Investigation**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Check previous logs
kubectl logs <pod-name> -n production --previous

# Check resource limits
kubectl get pod <pod-name> -n production -o yaml | grep -A 5 resources
```

**Resolution**:
- Fix application crash
- Increase resource limits
- Fix configuration issues
- Rollback if needed

## Dashboards

### Deployment Dashboard

Access: https://grafana.example.com/d/deployment-monitoring

Panels:
- Deployment status
- Rollout progress
- Error rates
- Response times
- Resource usage
- Pod health
- Blue-green status

### System Health Dashboard

Access: https://grafana.example.com/d/system-health

Monitors overall system health including:
- API performance
- Database performance
- Queue processing
- Worker health

## Notifications

### Slack Channels

- **#deployments**: All deployment notifications
- **#deployment-warnings**: Warning-level alerts
- **#production-incidents**: Critical alerts and incidents

### PagerDuty

Critical alerts trigger PagerDuty incidents:
- Deployment failures
- High error rates
- Pod crash loops
- Database migration failures

### Email

Deployment summaries sent to:
- ops-team@example.com
- Engineering managers

## Metrics Retention

- **Real-time metrics**: 15 days
- **Aggregated metrics**: 90 days
- **Long-term trends**: 1 year

## Best Practices

1. **Always monitor during deployments**
   - Keep dashboards open
   - Watch for anomalies
   - Be ready to rollback

2. **Set up proper baselines**
   - Capture metrics before deployment
   - Compare post-deployment metrics
   - Document normal ranges

3. **Use automated rollback**
   - Configure thresholds appropriately
   - Test rollback procedures
   - Document rollback decisions

4. **Document incidents**
   - Create incident reports
   - Update runbooks
   - Share learnings

5. **Regular review**
   - Review alert thresholds monthly
   - Update dashboards as needed
   - Refine rollback criteria

## Resources

- [Deployment Runbook](../../.github/DEPLOYMENT_RUNBOOK.md)
- [Production Environment](../environments/production/README.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
