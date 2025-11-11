# Production Deployment Guide

This guide walks through deploying the AI Video Dubbing Platform GPU infrastructure to production.

## Prerequisites

- [ ] Cloud provider account (GCP or AWS)
- [ ] kubectl installed and configured
- [ ] Docker installed (for building custom images)
- [ ] Helm installed (for some components)
- [ ] Access to container registry
- [ ] HuggingFace token (for model downloads)
- [ ] AWS/GCP credentials for storage

## Deployment Checklist

### Phase 1: Infrastructure Setup (30-60 minutes)

- [ ] **1.1** Choose cloud provider (GKE or EKS)
- [ ] **1.2** Review and update cluster configuration
  - Edit `infrastructure/gke-cluster.yaml` or `infrastructure/eks-cluster.yaml`
  - Set project ID, region, and instance types
- [ ] **1.3** Create Kubernetes cluster
  ```bash
  # GKE
  gcloud container clusters create ai-dubbing-production ...
  
  # EKS
  eksctl create cluster -f infrastructure/eks-cluster.yaml
  ```
- [ ] **1.4** Install NVIDIA device plugin
  ```bash
  kubectl apply -f infrastructure/gpu-sharing-config.yaml
  ```
- [ ] **1.5** Verify GPU nodes are ready
  ```bash
  kubectl get nodes -l nvidia.com/gpu=true
  ```
- [ ] **1.6** Apply resource quotas
  ```bash
  kubectl apply -f infrastructure/resource-quotas.yaml
  ```

### Phase 2: Secrets Configuration (15 minutes)

- [ ] **2.1** Create ai-models namespace
  ```bash
  kubectl create namespace ai-models
  ```
- [ ] **2.2** Create secrets for each service
  ```bash
  # Whisper + Pyannote
  kubectl create secret generic whisper-pyannote-secrets \
    --from-literal=HF_TOKEN=<your-token> \
    --from-literal=AWS_ACCESS_KEY_ID=<your-key> \
    --from-literal=AWS_SECRET_ACCESS_KEY=<your-secret> \
    -n ai-models
  
  # Repeat for other services
  ```
- [ ] **2.3** Verify secrets created
  ```bash
  kubectl get secrets -n ai-models
  ```

### Phase 3: Model Service Deployment (45-90 minutes)

- [ ] **3.1** Build and push Docker images
  ```bash
  # Build images from packages/workers/docker/
  docker build -t your-registry/whisper-pyannote:latest packages/workers/docker/whisper/
  docker push your-registry/whisper-pyannote:latest
  
  # Repeat for all services
  ```
- [ ] **3.2** Update image references in deployment files
  - Edit each YAML file in `deployments/`
  - Replace `your-registry` with actual registry
- [ ] **3.3** Deploy STT service
  ```bash
  kubectl apply -f deployments/whisper-pyannote-stt.yaml
  kubectl rollout status deployment/whisper-pyannote-stt -n ai-models
  ```
- [ ] **3.4** Deploy MT service
  ```bash
  kubectl apply -f deployments/marian-mt.yaml
  kubectl rollout status deployment/marian-mt -n ai-models
  ```
- [ ] **3.5** Deploy TTS services
  ```bash
  kubectl apply -f deployments/styletts-tts.yaml
  kubectl apply -f deployments/xtts-tts.yaml
  ```
- [ ] **3.6** Deploy Lip-Sync service
  ```bash
  kubectl apply -f deployments/wav2lip-lipsync.yaml
  ```
- [ ] **3.7** Verify all pods are running
  ```bash
  kubectl get pods -n ai-models
  ```
- [ ] **3.8** Test health endpoints
  ```bash
  kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
    curl http://whisper-pyannote-stt.ai-models.svc.cluster.local:8000/health
  ```

### Phase 4: Autoscaling Setup (30 minutes)

- [ ] **4.1** Install Metrics Server
  ```bash
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
  ```
- [ ] **4.2** Install NVIDIA DCGM Exporter
  ```bash
  helm install dcgm-exporter gpu-helm-charts/dcgm-exporter \
    --namespace gpu-operator-resources \
    --create-namespace
  ```
- [ ] **4.3** Build and deploy queue metrics exporter
  ```bash
  cd autoscaling
  docker build -f Dockerfile.queue-exporter -t your-registry/queue-metrics-exporter:latest .
  docker push your-registry/queue-metrics-exporter:latest
  ```
- [ ] **4.4** Deploy HPAs
  ```bash
  kubectl apply -f autoscaling/hpa-queue-based.yaml
  ```
- [ ] **4.5** Verify HPAs are working
  ```bash
  kubectl get hpa -n ai-models
  ```

### Phase 5: Monitoring Setup (45 minutes)

- [ ] **5.1** Create monitoring namespace
  ```bash
  kubectl create namespace monitoring
  ```
- [ ] **5.2** Update Grafana password
  - Edit `monitoring/prometheus-grafana.yaml`
  - Change admin password in secret
- [ ] **5.3** Deploy Prometheus and Grafana
  ```bash
  kubectl apply -f monitoring/prometheus-grafana.yaml
  ```
- [ ] **5.4** Update cost configuration
  - Edit `monitoring/cost-tracking.yaml`
  - Set actual GPU instance costs
  - Set monthly budgets per service
- [ ] **5.5** Build and deploy cost exporter
  ```bash
  cd monitoring
  docker build -f Dockerfile.cost-exporter -t your-registry/cost-tracking-exporter:latest .
  docker push your-registry/cost-tracking-exporter:latest
  ```
- [ ] **5.6** Deploy cost tracking
  ```bash
  kubectl apply -f monitoring/cost-tracking.yaml
  ```
- [ ] **5.7** Access Grafana
  ```bash
  kubectl port-forward -n monitoring svc/grafana 3000:80
  # Open http://localhost:3000
  ```
- [ ] **5.8** Import dashboards
  ```bash
  kubectl create configmap grafana-dashboards \
    --from-file=cost-dashboard.json=grafana-dashboards.json \
    -n monitoring
  ```

### Phase 6: Load Balancing (15 minutes)

- [ ] **6.1** Deploy internal load balancers
  ```bash
  kubectl apply -f ingress/model-services-ingress.yaml
  ```
- [ ] **6.2** Verify services are accessible
  ```bash
  kubectl get svc -n ai-models
  ```

### Phase 7: Testing (30 minutes)

- [ ] **7.1** Test STT service
  ```bash
  # Submit test job to STT queue
  ```
- [ ] **7.2** Test MT service
  ```bash
  # Submit test job to MT queue
  ```
- [ ] **7.3** Test TTS services
  ```bash
  # Submit test jobs to TTS queue
  ```
- [ ] **7.4** Test Lip-Sync service
  ```bash
  # Submit test job to lip-sync queue
  ```
- [ ] **7.5** Verify autoscaling
  ```bash
  # Add multiple jobs and watch pods scale
  kubectl get hpa -n ai-models -w
  ```
- [ ] **7.6** Verify cost tracking
  ```bash
  # Check Grafana dashboard for cost metrics
  ```

### Phase 8: Production Hardening (60 minutes)

- [ ] **8.1** Configure alerts
  - Set up Slack/PagerDuty webhooks
  - Test alert notifications
- [ ] **8.2** Set up backup
  - Configure Prometheus backup
  - Configure Grafana backup
- [ ] **8.3** Configure log aggregation
  - Set up log forwarding to DataDog/ELK
- [ ] **8.4** Review security
  - Audit RBAC permissions
  - Review network policies
  - Scan images for vulnerabilities
- [ ] **8.5** Document runbooks
  - Create incident response procedures
  - Document common troubleshooting steps
- [ ] **8.6** Set up on-call rotation
  - Configure PagerDuty schedules
  - Train team on troubleshooting

## Post-Deployment

### Week 1: Monitoring and Tuning

- [ ] Monitor GPU utilization daily
- [ ] Review cost metrics daily
- [ ] Tune autoscaling thresholds
- [ ] Adjust resource requests/limits
- [ ] Optimize batch sizes

### Week 2-4: Optimization

- [ ] Analyze cost trends
- [ ] Implement spot instance usage
- [ ] Optimize GPU time-slicing
- [ ] Review and adjust budgets
- [ ] Fine-tune scaling policies

### Monthly: Review and Adjust

- [ ] Monthly cost review
- [ ] Performance analysis
- [ ] Capacity planning
- [ ] Update documentation
- [ ] Team retrospective

## Rollback Procedures

### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/<deployment-name> -n ai-models

# Rollback to specific revision
kubectl rollout undo deployment/<deployment-name> -n ai-models --to-revision=2
```

### Emergency Scale Down

```bash
# Scale down all services
kubectl scale deployment --all --replicas=0 -n ai-models

# Scale down specific service
kubectl scale deployment/<deployment-name> --replicas=0 -n ai-models
```

### Disaster Recovery

```bash
# Restore from backup
# 1. Restore Prometheus data
# 2. Restore Grafana dashboards
# 3. Redeploy services from last known good configuration
```

## Cost Estimates

### Development/Staging

- 1 V100 GPU node: ~$2,000/month
- 2 CPU nodes: ~$300/month
- **Total**: ~$2,300/month

### Production (Small)

- 2 V100 GPU nodes: ~$4,000/month
- 2 CPU nodes: ~$300/month
- **Total**: ~$4,300/month

### Production (Medium)

- 4 V100 GPU nodes: ~$8,000/month
- 1 A100 GPU node: ~$3,000/month
- 4 CPU nodes: ~$600/month
- **Total**: ~$11,600/month

### Production (Large)

- 6 V100 GPU nodes: ~$12,000/month
- 2 A100 GPU nodes: ~$6,000/month
- 6 CPU nodes: ~$900/month
- **Total**: ~$18,900/month

*Note: Costs can be reduced by 60-90% using spot instances*

## Support Contacts

- **Infrastructure**: [team-email]
- **On-Call**: [pagerduty-link]
- **Documentation**: [wiki-link]
- **Slack Channel**: #ai-dubbing-infra

## Additional Resources

- [Infrastructure README](infrastructure/README.md)
- [Deployment README](deployments/README.md)
- [Autoscaling README](autoscaling/README.md)
- [Monitoring README](monitoring/README.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
