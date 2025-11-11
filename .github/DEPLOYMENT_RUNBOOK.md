# Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying the AI Video Dubbing Platform, handling deployment failures, and performing rollbacks.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Process](#deployment-process)
3. [Rollback Procedures](#rollback-procedures)
4. [Troubleshooting](#troubleshooting)
5. [Emergency Contacts](#emergency-contacts)

## Pre-Deployment Checklist

Before initiating a deployment, ensure:

- [ ] All tests pass in CI/CD pipeline
- [ ] Security scans show no critical vulnerabilities
- [ ] Database migrations have been reviewed and tested in staging
- [ ] Deployment approval has been obtained from team lead
- [ ] On-call engineer is available during deployment window
- [ ] Rollback plan is documented and understood
- [ ] Monitoring dashboards are open and ready
- [ ] Stakeholders have been notified of deployment window

## Deployment Process

### Staging Deployment

Staging deployments are automatic when code is merged to the `develop` branch.

1. **Merge PR to develop branch**
   ```bash
   git checkout develop
   git pull origin develop
   git merge feature/your-feature
   git push origin develop
   ```

2. **Monitor CI/CD pipeline**
   - Watch GitHub Actions workflow progress
   - Verify all jobs complete successfully
   - Check deployment logs for any warnings

3. **Verify staging deployment**
   ```bash
   # Check deployment status
   kubectl get deployments -n staging
   
   # Check pod health
   kubectl get pods -n staging
   
   # View logs
   kubectl logs -f deployment/backend -n staging
   ```

4. **Run smoke tests**
   ```bash
   curl https://staging.dubbing-platform.example.com/health
   ```

5. **Perform manual testing**
   - Test critical user flows
   - Verify new features work as expected
   - Check for any regressions

### Production Deployment

Production deployments are automatic when code is merged to the `main` branch, but require manual approval.

1. **Merge develop to main**
   ```bash
   git checkout main
   git pull origin main
   git merge develop
   git push origin main
   ```

2. **Approve deployment in GitHub**
   - Navigate to Actions tab
   - Find the running workflow
   - Click "Review deployments"
   - Approve production deployment

3. **Monitor blue-green deployment**
   ```bash
   # Watch green deployment rollout
   kubectl rollout status deployment/backend-green -n production
   kubectl rollout status deployment/frontend-green -n production
   kubectl rollout status deployment/workers-green -n production
   ```

4. **Verify green environment health**
   ```bash
   # Check pod status
   kubectl get pods -l version=green -n production
   
   # Test green service directly
   kubectl run test-pod --rm -i --tty --image=curlimages/curl -- \
     curl http://backend-green-service:3000/health
   ```

5. **Monitor traffic switch**
   - Watch monitoring dashboards for error rates
   - Check response times
   - Monitor queue depths
   - Verify no spike in errors

6. **Verify production deployment**
   ```bash
   curl https://dubbing-platform.example.com/health
   ```

7. **Monitor for 15 minutes**
   - Watch error rates in DataDog/Grafana
   - Check Sentry for new errors
   - Monitor user activity
   - Verify job processing continues normally

8. **Scale down blue environment** (after 15 minutes of stable operation)
   ```bash
   kubectl scale deployment/backend-blue --replicas=1 -n production
   kubectl scale deployment/frontend-blue --replicas=1 -n production
   kubectl scale deployment/workers-blue --replicas=1 -n production
   ```

## Rollback Procedures

### Automatic Rollback

If the deployment fails health checks, the CI/CD pipeline will automatically attempt to rollback by switching traffic back to the blue environment.

### Manual Rollback

If issues are detected after deployment:

1. **Immediate traffic switch to blue**
   ```bash
   kubectl patch service backend-service -n production \
     -p '{"spec":{"selector":{"version":"blue"}}}'
   
   kubectl patch service frontend-service -n production \
     -p '{"spec":{"selector":{"version":"blue"}}}'
   ```

2. **Verify blue environment is serving traffic**
   ```bash
   curl https://dubbing-platform.example.com/health
   ```

3. **Check blue environment health**
   ```bash
   kubectl get pods -l version=blue -n production
   kubectl logs -f deployment/backend-blue -n production
   ```

4. **Scale down green environment**
   ```bash
   kubectl scale deployment/backend-green --replicas=0 -n production
   kubectl scale deployment/frontend-green --replicas=0 -n production
   kubectl scale deployment/workers-green --replicas=0 -n production
   ```

5. **Rollback database migrations** (if needed)
   ```bash
   # Trigger manual migration rollback workflow
   # Go to Actions > Database Migration > Run workflow
   # Select: environment=production, action=rollback
   ```

6. **Notify stakeholders**
   - Post in #incidents Slack channel
   - Update status page
   - Create incident report

### Database Migration Rollback

Database migrations are more complex and require careful handling:

1. **Create database backup**
   ```bash
   # For PostgreSQL on AWS RDS
   aws rds create-db-snapshot \
     --db-instance-identifier dubbing-platform-prod \
     --db-snapshot-identifier rollback-$(date +%Y%m%d-%H%M%S)
   ```

2. **Review migration history**
   ```bash
   npx prisma migrate status
   ```

3. **Apply rollback migration**
   - Create a new migration that reverses the changes
   - Test thoroughly in staging first
   - Apply to production using the Database Migration workflow

4. **Verify data integrity**
   - Run data validation queries
   - Check application functionality
   - Monitor for errors

## Troubleshooting

### Deployment Stuck in Progress

**Symptoms:** Deployment doesn't complete within expected time

**Actions:**
1. Check pod status: `kubectl get pods -n production`
2. Describe problematic pods: `kubectl describe pod <pod-name> -n production`
3. Check events: `kubectl get events -n production --sort-by='.lastTimestamp'`
4. Common issues:
   - Image pull errors: Verify image exists in registry
   - Resource constraints: Check node resources
   - Health check failures: Review application logs

### High Error Rate After Deployment

**Symptoms:** Error rate spikes in monitoring dashboards

**Actions:**
1. Immediately rollback to blue environment
2. Check application logs: `kubectl logs -f deployment/backend-green -n production`
3. Check Sentry for error details
4. Review recent code changes
5. Test in staging environment to reproduce

### Database Migration Failures

**Symptoms:** Migration job fails or times out

**Actions:**
1. Check migration job logs: `kubectl logs job/prisma-migrate-<sha> -n production`
2. Connect to database and check migration status
3. Common issues:
   - Lock timeout: Another migration is running
   - Constraint violations: Data doesn't match new schema
   - Permission errors: Database user lacks privileges
4. If safe, retry migration
5. If not safe, rollback deployment and investigate

### Service Unavailable After Deployment

**Symptoms:** Health checks fail, 503 errors

**Actions:**
1. Check pod status: `kubectl get pods -n production`
2. Check service endpoints: `kubectl get endpoints -n production`
3. Verify service selectors match pod labels
4. Check ingress configuration: `kubectl get ingress -n production`
5. Review application startup logs

### Worker Jobs Not Processing

**Symptoms:** Job queue depth increasing, no processing

**Actions:**
1. Check worker pod status: `kubectl get pods -l app=workers -n production`
2. Check Redis connectivity: `kubectl exec -it <worker-pod> -- redis-cli -h redis-service ping`
3. Check worker logs: `kubectl logs -f deployment/workers -n production`
4. Verify queue configuration
5. Check for worker crashes or restarts

## Monitoring During Deployment

### Key Metrics to Watch

1. **Error Rates**
   - API error rate < 1%
   - Worker error rate < 2%
   - Database error rate < 0.1%

2. **Response Times**
   - P95 API response time < 500ms
   - P99 API response time < 2s

3. **Job Processing**
   - Queue depth not increasing
   - Job completion rate stable
   - Worker utilization normal

4. **Resource Usage**
   - CPU usage < 80%
   - Memory usage < 85%
   - GPU utilization normal

### Monitoring Dashboards

- **System Health Dashboard**: https://grafana.example.com/d/system-health
- **Job Processing Dashboard**: https://grafana.example.com/d/job-processing
- **Model Performance Dashboard**: https://grafana.example.com/d/model-performance
- **User Activity Dashboard**: https://grafana.example.com/d/user-activity

### Alert Channels

- **Slack**: #production-alerts
- **PagerDuty**: Production on-call rotation
- **Email**: ops-team@example.com

## Emergency Contacts

### On-Call Rotation

- **Primary On-Call**: Check PagerDuty schedule
- **Secondary On-Call**: Check PagerDuty schedule
- **Engineering Manager**: manager@example.com
- **DevOps Lead**: devops-lead@example.com

### Escalation Path

1. Primary on-call engineer (immediate)
2. Secondary on-call engineer (if no response in 15 min)
3. Engineering manager (if critical issue)
4. CTO (if business-critical outage)

## Post-Deployment

### Verification Checklist

- [ ] All services are healthy
- [ ] Error rates are normal
- [ ] Response times are acceptable
- [ ] Job processing is working
- [ ] No new errors in Sentry
- [ ] Monitoring dashboards show green
- [ ] Blue environment scaled down (after 15 min)
- [ ] Deployment documented in changelog
- [ ] Stakeholders notified of successful deployment

### Post-Mortem (if issues occurred)

If any issues occurred during deployment:

1. Create incident report within 24 hours
2. Document timeline of events
3. Identify root cause
4. List action items to prevent recurrence
5. Share learnings with team
6. Update runbook with new procedures

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-11-04 | 1.0 | Initial runbook creation | DevOps Team |
