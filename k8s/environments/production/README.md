# Production Environment

This directory contains Kubernetes manifests for the production environment of the AI Video Dubbing Platform with blue-green deployment strategy.

## Overview

The production environment is designed for:
- High availability and fault tolerance
- Zero-downtime deployments using blue-green strategy
- Horizontal auto-scaling based on load
- Production-grade security and monitoring
- Disaster recovery and backup procedures

## Architecture

### Blue-Green Deployment

The production environment uses a blue-green deployment strategy:
- **Blue**: Current stable version serving production traffic
- **Green**: New version deployed alongside blue for testing
- **Traffic Switch**: Instant cutover from blue to green after validation
- **Rollback**: Quick revert to blue if issues are detected

### Components

- **Backend API**: 3-10 replicas (auto-scaled) with blue-green deployment
- **Frontend**: 3-10 replicas (auto-scaled) with blue-green deployment
- **Workers**: 5-20 replicas (auto-scaled) with blue-green deployment
- **PostgreSQL**: High-availability setup (recommend managed service)
- **Redis**: Master-replica cluster for caching and job queues
- **S3 Storage**: Production bucket with lifecycle policies

### High Availability Features

- Pod anti-affinity for distribution across nodes
- Multiple replicas for all services
- Horizontal Pod Autoscaling (HPA)
- Health checks and automatic restarts
- Database replication and backups
- Redis master-replica setup

## Prerequisites

Before deploying to production:

1. **Kubernetes Cluster**
   - Production-grade cluster (EKS, GKE, or AKS)
   - Sufficient resources (100 CPU cores, 200Gi memory, 8 GPUs)
   - Multiple availability zones for HA

2. **Managed Services** (Recommended)
   - AWS RDS for PostgreSQL (or equivalent)
   - AWS ElastiCache for Redis (or equivalent)
   - S3 for object storage

3. **Secrets and Credentials**
   - Database credentials
   - S3/storage credentials
   - JWT secrets (strong, unique)
   - Sentry DSN
   - DataDog API key
   - TLS certificates

4. **DNS Configuration**
   - dubbing-platform.example.com → Frontend
   - api.dubbing-platform.example.com → Backend API

5. **Monitoring and Alerting**
   - Grafana dashboards configured
   - DataDog APM set up
   - Sentry error tracking configured
   - PagerDuty on-call rotation

6. **Backup Strategy**
   - Database backup schedule
   - S3 versioning enabled
   - Disaster recovery plan documented

## Setup

### Initial Production Setup

1. **Review and update all secrets**:
   ```bash
   # CRITICAL: Use strong, unique production values
   vim database.yaml
   vim storage.yaml
   vim backend-blue-green.yaml
   ```

2. **Set up managed database** (Recommended):
   - Create RDS PostgreSQL instance
   - Configure security groups
   - Enable automated backups
   - Set up read replicas
   - Update database.yaml with ExternalName service

3. **Set up managed Redis** (Recommended):
   - Create ElastiCache Redis cluster
   - Configure replication
   - Update redis.yaml or create ExternalName service

4. **Configure S3 bucket**:
   ```bash
   # Create production bucket
   aws s3 mb s3://dubbing-platform-production
   
   # Apply lifecycle policies
   aws s3api put-bucket-lifecycle-configuration \
     --bucket dubbing-platform-production \
     --lifecycle-configuration file://s3-lifecycle.json
   
   # Enable versioning
   aws s3api put-bucket-versioning \
     --bucket dubbing-platform-production \
     --versioning-configuration Status=Enabled
   ```

5. **Run the setup script**:
   ```bash
   ./setup.sh
   ```

6. **Run database migrations**:
   ```bash
   kubectl run prisma-migrate --rm -i --tty \
     --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:main \
     --restart=Never \
     --env="DATABASE_URL=postgresql://dubbing_prod:PASSWORD@postgres-service:5432/dubbing_prod" \
     -n production \
     -- npm run prisma:migrate:deploy
   ```

7. **Verify deployment**:
   ```bash
   # Check all pods are running
   kubectl get pods -n production
   
   # Check services
   kubectl get services -n production
   
   # Test health endpoints
   curl https://api.dubbing-platform.example.com/health
   curl https://dubbing-platform.example.com
   ```

## Blue-Green Deployment Process

### Current State Check

```bash
# Check which version is active
kubectl get service backend-service -n production -o yaml | grep version

# Check both deployments
kubectl get deployments -n production | grep backend
```

### Deploying New Version (Green)

1. **Update green deployment image**:
   ```bash
   kubectl set image deployment/backend-green \
     backend=ghcr.io/your-org/ai-video-dubbing-platform-backend:v2.0.0 \
     -n production
   ```

2. **Wait for green to be ready**:
   ```bash
   kubectl rollout status deployment/backend-green -n production
   ```

3. **Test green environment directly**:
   ```bash
   # Port forward to green service
   kubectl port-forward svc/backend-green-service 8080:3000 -n production
   
   # Test in another terminal
   curl http://localhost:8080/health
   ```

4. **Run smoke tests against green**:
   ```bash
   kubectl run smoke-test --rm -i --tty \
     --image=curlimages/curl:latest \
     --restart=Never \
     -n production \
     -- curl -f http://backend-green-service:3000/health
   ```

### Switching Traffic to Green

```bash
# Switch backend traffic to green
kubectl patch service backend-service -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Switch frontend traffic to green
kubectl patch service frontend-service -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify the switch
kubectl get service backend-service -n production -o yaml | grep version
```

### Monitoring After Switch

Monitor these metrics for 15-30 minutes:
- Error rates (should remain < 1%)
- Response times (P95 < 500ms)
- Job processing rates
- Database connection pool
- Memory and CPU usage

### Rollback to Blue

If issues are detected:

```bash
# Immediate rollback
kubectl patch service backend-service -n production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

kubectl patch service frontend-service -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify rollback
curl https://api.dubbing-platform.example.com/health
```

### Cleanup Old Version

After green is stable for 24 hours:

```bash
# Scale down blue (keep 1 replica as backup)
kubectl scale deployment/backend-blue --replicas=1 -n production
kubectl scale deployment/frontend-blue --replicas=1 -n production
kubectl scale deployment/workers-blue --replicas=1 -n production

# After 7 days, you can scale to 0 or update blue to match green
```

## Configuration

### Resource Limits

**Backend**:
- Requests: 1 CPU, 2Gi memory
- Limits: 4 CPU, 8Gi memory
- Replicas: 3-10 (auto-scaled)

**Frontend**:
- Requests: 500m CPU, 1Gi memory
- Limits: 2 CPU, 4Gi memory
- Replicas: 3-10 (auto-scaled)

**Workers**:
- Requests: 1 CPU, 2Gi memory
- Limits: 4 CPU, 8Gi memory
- Replicas: 5-20 (auto-scaled)

**PostgreSQL**:
- Requests: 2 CPU, 8Gi memory
- Limits: 4 CPU, 16Gi memory
- Storage: 500Gi

**Redis**:
- Master: 1 CPU, 4Gi memory (limit: 2 CPU, 8Gi)
- Replicas: 500m CPU, 2Gi memory (limit: 1 CPU, 4Gi)

### Auto-Scaling Configuration

HPA triggers scale-up when:
- CPU utilization > 70%
- Memory utilization > 80%

### Environment Variables

See individual manifest files for complete configuration. Key settings:

- `NODE_ENV`: production
- `LOG_LEVEL`: info
- `RATE_LIMIT_MAX`: 100 requests per 15 minutes
- `JWT_EXPIRY`: 15 minutes
- `JWT_REFRESH_EXPIRY`: 7 days

## Maintenance

### Database Backups

Automated daily backups via CronJob:
```bash
# Check backup CronJob
kubectl get cronjob postgres-backup -n production

# Manually trigger backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n production
```

### Database Migrations

Use the GitHub Actions workflow or manual process:

```bash
# Via GitHub Actions
# Go to Actions > Database Migration > Run workflow
# Select: environment=production, action=deploy

# Manual migration
kubectl run prisma-migrate-$(date +%s) --rm -i --tty \
  --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:main \
  --restart=Never \
  --env="DATABASE_URL=$DATABASE_URL" \
  -n production \
  -- npm run prisma:migrate:deploy
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/backend-blue --replicas=5 -n production

# Check HPA status
kubectl get hpa -n production

# Describe HPA for details
kubectl describe hpa backend-blue-hpa -n production
```

### Updates and Patches

```bash
# Update specific deployment
kubectl set image deployment/backend-blue \
  backend=ghcr.io/your-org/ai-video-dubbing-platform-backend:v1.2.3 \
  -n production

# Restart deployment (rolling restart)
kubectl rollout restart deployment/backend-blue -n production

# Check rollout status
kubectl rollout status deployment/backend-blue -n production

# Rollout history
kubectl rollout history deployment/backend-blue -n production
```

## Monitoring

### Health Checks

```bash
# Backend health
curl https://api.dubbing-platform.example.com/health

# Frontend health
curl https://dubbing-platform.example.com

# Check pod health
kubectl get pods -n production
kubectl describe pod <pod-name> -n production
```

### Logs

```bash
# Backend logs (blue)
kubectl logs -f deployment/backend-blue -n production

# Backend logs (green)
kubectl logs -f deployment/backend-green -n production

# All backend logs
kubectl logs -f -l app=backend -n production

# Worker logs
kubectl logs -f deployment/workers-blue -n production

# Logs from last hour
kubectl logs --since=1h deployment/backend-blue -n production
```

### Metrics

```bash
# Resource usage
kubectl top pods -n production
kubectl top nodes

# HPA metrics
kubectl get hpa -n production -w
```

### Dashboards

- **Grafana**: https://grafana.example.com
  - System Health Dashboard
  - Job Processing Dashboard
  - Model Performance Dashboard
  - User Activity Dashboard

- **DataDog**: https://app.datadoghq.com
  - APM traces
  - Custom metrics
  - Log aggregation

- **Sentry**: https://sentry.io
  - Error tracking
  - Performance monitoring
  - Release tracking

## Troubleshooting

### High Error Rate

1. Check application logs
2. Review Sentry errors
3. Check database connections
4. Verify Redis connectivity
5. Consider rollback if critical

### Performance Degradation

1. Check resource usage (CPU, memory)
2. Review database query performance
3. Check Redis hit rates
4. Verify network latency
5. Scale up if needed

### Pod Crashes

```bash
# Check pod status
kubectl get pods -n production

# Describe pod for events
kubectl describe pod <pod-name> -n production

# Check previous logs
kubectl logs <pod-name> -n production --previous

# Check resource limits
kubectl top pod <pod-name> -n production
```

### Database Issues

```bash
# Check database pod
kubectl get pod -l app=postgres -n production

# Check database logs
kubectl logs -l app=postgres -n production

# Connect to database
kubectl exec -it <postgres-pod> -n production -- psql -U dubbing_prod

# Check connections
SELECT count(*) FROM pg_stat_activity;
```

### Redis Issues

```bash
# Check Redis master
kubectl get pod -l app=redis,role=master -n production

# Test Redis connection
kubectl exec -it <redis-pod> -n production -- redis-cli ping

# Check Redis info
kubectl exec -it <redis-pod> -n production -- redis-cli info
```

## Security

### Secrets Management

- All secrets stored in Kubernetes Secrets
- Rotate secrets regularly (quarterly)
- Use strong, unique values for production
- Never commit secrets to version control

### Network Security

- TLS/SSL for all external traffic
- Internal service-to-service communication
- Network policies for pod isolation
- Rate limiting on ingress

### Access Control

- RBAC for Kubernetes access
- Principle of least privilege
- Audit logging enabled
- Regular access reviews

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups, 30-day retention
- **S3**: Versioning enabled, lifecycle policies
- **Configuration**: All manifests in version control

### Recovery Procedures

1. **Database Recovery**:
   ```bash
   # Restore from backup
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier dubbing-platform-prod-restored \
     --db-snapshot-identifier <snapshot-id>
   ```

2. **Application Recovery**:
   ```bash
   # Redeploy from known good version
   kubectl set image deployment/backend-blue \
     backend=ghcr.io/your-org/ai-video-dubbing-platform-backend:v1.0.0 \
     -n production
   ```

### RTO and RPO

- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 24 hours

## Support

### On-Call

- Primary: Check PagerDuty schedule
- Secondary: Check PagerDuty schedule
- Escalation: Engineering Manager → CTO

### Runbooks

- Deployment procedures: `.github/DEPLOYMENT_RUNBOOK.md`
- Incident response: Internal wiki
- Rollback procedures: This README

### Communication

- **Incidents**: #production-incidents Slack channel
- **Deployments**: #deployments Slack channel
- **Status Page**: https://status.dubbing-platform.example.com

## Compliance and Auditing

- All deployments logged and tracked
- Access logs retained for 90 days
- Regular security audits
- Compliance with SOC 2, GDPR requirements

## Cost Optimization

- Right-size resources based on actual usage
- Use spot instances for non-critical workloads
- Implement S3 lifecycle policies
- Monitor and optimize database queries
- Review and adjust auto-scaling thresholds

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-11-04 | 1.0 | Initial production environment setup | DevOps Team |
