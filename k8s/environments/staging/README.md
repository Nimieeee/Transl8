# Staging Environment

This directory contains Kubernetes manifests for the staging environment of the AI Video Dubbing Platform.

## Overview

The staging environment is used for:
- Testing new features before production deployment
- Integration testing with production-like infrastructure
- Performance testing and load testing
- User acceptance testing (UAT)
- Validating database migrations

## Architecture

The staging environment includes:
- **Backend API**: 2 replicas for high availability
- **Frontend**: 2 replicas for load distribution
- **Workers**: 2 replicas for job processing
- **PostgreSQL**: Single instance with persistent storage
- **Redis**: Single instance for caching and job queues
- **S3 Storage**: Dedicated staging bucket

## Prerequisites

Before deploying to staging, ensure you have:

1. **kubectl** installed and configured
2. **Access to Kubernetes cluster** with staging namespace
3. **Secrets configured**:
   - Database credentials
   - S3/storage credentials
   - JWT secrets
   - Sentry DSN
   - DataDog API key
4. **DNS configured** for:
   - staging.dubbing-platform.example.com
   - staging-api.dubbing-platform.example.com
5. **TLS certificates** (managed by cert-manager)

## Setup

### Initial Setup

1. **Update secrets** in the manifest files:
   ```bash
   # Edit these files and replace REPLACE_WITH_ACTUAL_* placeholders
   vim database.yaml
   vim storage.yaml
   vim backend.yaml
   ```

2. **Run the setup script**:
   ```bash
   ./setup.sh
   ```

3. **Run database migrations**:
   ```bash
   kubectl run prisma-migrate --rm -i --tty \
     --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:develop \
     --restart=Never \
     --env="DATABASE_URL=postgresql://dubbing_staging:PASSWORD@postgres-service:5432/dubbing_staging" \
     -n staging \
     -- npm run prisma:migrate:deploy
   ```

4. **Verify deployment**:
   ```bash
   # Check all pods are running
   kubectl get pods -n staging
   
   # Check services
   kubectl get services -n staging
   
   # Test health endpoint
   curl https://staging-api.dubbing-platform.example.com/health
   ```

### Manual Deployment

If you prefer to deploy manually:

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Deploy database
kubectl apply -f database.yaml

# Deploy Redis
kubectl apply -f redis.yaml

# Deploy storage config
kubectl apply -f storage.yaml

# Deploy backend
kubectl apply -f backend.yaml

# Deploy frontend
kubectl apply -f frontend.yaml

# Deploy workers
kubectl apply -f workers.yaml

# Deploy ingress
kubectl apply -f ingress.yaml
```

## Configuration

### Environment Variables

Backend configuration is managed through ConfigMaps and Secrets:

**ConfigMap (backend-config)**:
- `NODE_ENV`: staging
- `PORT`: 3000
- `LOG_LEVEL`: debug
- `CORS_ORIGIN`: https://staging.dubbing-platform.example.com
- `JWT_EXPIRY`: 15m
- `JWT_REFRESH_EXPIRY`: 7d

**Secrets (backend-secrets)**:
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `SENTRY_DSN`: Sentry error tracking DSN
- `DATADOG_API_KEY`: DataDog monitoring API key

### Resource Limits

**Namespace Quotas**:
- CPU: 20 cores
- Memory: 40Gi
- GPUs: 2
- PVCs: 10
- Load Balancers: 2

**Container Limits**:
- Backend: 500m-2000m CPU, 1Gi-4Gi memory
- Frontend: 250m-1000m CPU, 512Mi-2Gi memory
- Workers: 500m-2000m CPU, 1Gi-4Gi memory
- PostgreSQL: 500m-2000m CPU, 1Gi-4Gi memory
- Redis: 250m-1000m CPU, 512Mi-2Gi memory

## Accessing the Environment

### Web Interface

- **Frontend**: https://staging.dubbing-platform.example.com
- **API**: https://staging-api.dubbing-platform.example.com

### Database Access

```bash
# Port forward to PostgreSQL
kubectl port-forward svc/postgres-service 5432:5432 -n staging

# Connect with psql
psql postgresql://dubbing_staging:PASSWORD@localhost:5432/dubbing_staging
```

### Redis Access

```bash
# Port forward to Redis
kubectl port-forward svc/redis-service 6379:6379 -n staging

# Connect with redis-cli
redis-cli -h localhost -p 6379
```

### Application Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n staging

# Frontend logs
kubectl logs -f deployment/frontend -n staging

# Worker logs
kubectl logs -f deployment/workers -n staging

# All logs with labels
kubectl logs -f -l environment=staging -n staging
```

## Maintenance

### Updating Deployments

Deployments are automatically updated by the CI/CD pipeline when code is merged to the `develop` branch.

Manual update:
```bash
kubectl set image deployment/backend backend=ghcr.io/your-org/ai-video-dubbing-platform-backend:develop -n staging
kubectl rollout status deployment/backend -n staging
```

### Database Migrations

```bash
# Run migrations
kubectl run prisma-migrate-$(date +%s) --rm -i --tty \
  --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:develop \
  --restart=Never \
  --env="DATABASE_URL=postgresql://dubbing_staging:PASSWORD@postgres-service:5432/dubbing_staging" \
  -n staging \
  -- npm run prisma:migrate:deploy

# Check migration status
kubectl run prisma-status --rm -i --tty \
  --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:develop \
  --restart=Never \
  --env="DATABASE_URL=postgresql://dubbing_staging:PASSWORD@postgres-service:5432/dubbing_staging" \
  -n staging \
  -- npx prisma migrate status
```

### Scaling

```bash
# Scale backend
kubectl scale deployment/backend --replicas=3 -n staging

# Scale workers
kubectl scale deployment/workers --replicas=4 -n staging
```

### Restarting Services

```bash
# Restart backend
kubectl rollout restart deployment/backend -n staging

# Restart all deployments
kubectl rollout restart deployment -n staging
```

## Monitoring

### Health Checks

```bash
# Backend health
curl https://staging-api.dubbing-platform.example.com/health

# Check pod health
kubectl get pods -n staging
kubectl describe pod <pod-name> -n staging
```

### Metrics

- **Grafana**: Access monitoring dashboards
- **DataDog**: Application performance monitoring
- **Sentry**: Error tracking and reporting

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n staging

# Node resource usage
kubectl top nodes
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n staging

# Describe pod for events
kubectl describe pod <pod-name> -n staging

# Check logs
kubectl logs <pod-name> -n staging
```

### Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pod -l app=postgres -n staging

# Check PostgreSQL logs
kubectl logs -l app=postgres -n staging

# Test connection from backend pod
kubectl exec -it deployment/backend -n staging -- \
  psql postgresql://dubbing_staging:PASSWORD@postgres-service:5432/dubbing_staging -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis pod
kubectl get pod -l app=redis -n staging

# Test Redis connection
kubectl exec -it deployment/backend -n staging -- \
  redis-cli -h redis-service ping
```

### Ingress Issues

```bash
# Check ingress status
kubectl get ingress -n staging
kubectl describe ingress staging-ingress -n staging

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Cleanup

To remove the staging environment:

```bash
# Delete all resources in staging namespace
kubectl delete namespace staging

# Or delete individual resources
kubectl delete -f .
```

## CI/CD Integration

The staging environment is automatically deployed when:
- Code is merged to the `develop` branch
- CI/CD pipeline completes successfully
- All tests pass

Deployment process:
1. Build Docker images
2. Push to container registry
3. Update Kubernetes deployments
4. Run smoke tests
5. Notify team of deployment status

## Security

- All secrets are stored in Kubernetes Secrets
- TLS certificates are managed by cert-manager
- Network policies restrict pod-to-pod communication
- Resource quotas prevent resource exhaustion
- RBAC controls access to namespace resources

## Support

For issues with the staging environment:
1. Check the troubleshooting section above
2. Review application logs
3. Check monitoring dashboards
4. Contact DevOps team in #staging-support Slack channel
