# Kubernetes Infrastructure for AI Video Dubbing Platform

This directory contains all Kubernetes configurations for deploying and managing the AI Video Dubbing Platform's production GPU infrastructure.

## Directory Structure

```
k8s/
├── infrastructure/          # Cluster setup and GPU node pools
│   ├── gke-cluster.yaml
│   ├── eks-cluster.yaml
│   ├── resource-quotas.yaml
│   ├── gpu-sharing-config.yaml
│   └── README.md
├── deployments/            # Model service deployments
│   ├── whisper-pyannote-stt.yaml
│   ├── marian-mt.yaml
│   ├── styletts-tts.yaml
│   ├── xtts-tts.yaml
│   ├── wav2lip-lipsync.yaml
│   └── README.md
├── autoscaling/            # Horizontal pod autoscaling
│   ├── hpa-queue-based.yaml
│   ├── queue-metrics-exporter.py
│   ├── Dockerfile.queue-exporter
│   └── README.md
├── ingress/                # Load balancing and ingress
│   └── model-services-ingress.yaml
├── blue-green/             # Blue-green deployment strategy
│   └── deployment-strategy.yaml
├── health-checks/          # Health check configurations
│   └── health-probes.yaml
└── monitoring/             # Monitoring and cost tracking
    ├── prometheus-grafana.yaml
    ├── cost-tracking.yaml
    ├── cost-tracking-exporter.py
    ├── Dockerfile.cost-exporter
    ├── grafana-dashboards.json
    └── README.md
```

## Quick Start

### 1. Deploy Infrastructure

Choose your cloud provider:

**For GKE:**
```bash
# Create cluster
gcloud container clusters create ai-dubbing-production \
  --region us-central1 \
  --enable-autoscaling \
  --machine-type n2-standard-4

# Add GPU node pools
gcloud container node-pools create gpu-v100-pool \
  --cluster ai-dubbing-production \
  --region us-central1 \
  --machine-type n1-standard-8 \
  --accelerator type=nvidia-tesla-v100,count=1 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 8

# Get credentials
gcloud container clusters get-credentials ai-dubbing-production --region us-central1
```

**For EKS:**
```bash
# Create cluster
eksctl create cluster -f k8s/infrastructure/eks-cluster.yaml

# Verify
kubectl get nodes
```

### 2. Install GPU Support

```bash
# Apply GPU configurations
kubectl apply -f k8s/infrastructure/gpu-sharing-config.yaml

# Verify GPU nodes
kubectl get nodes -l nvidia.com/gpu=true
```

### 3. Apply Resource Quotas

```bash
kubectl apply -f k8s/infrastructure/resource-quotas.yaml
```

### 4. Deploy Model Services

```bash
# Create secrets (update with your credentials)
kubectl create namespace ai-models

kubectl create secret generic whisper-pyannote-secrets \
  --from-literal=HF_TOKEN=your-token \
  --from-literal=AWS_ACCESS_KEY_ID=your-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret \
  -n ai-models

# Deploy all services
kubectl apply -f k8s/deployments/

# Verify deployments
kubectl get pods -n ai-models
```

### 5. Deploy Autoscaling

```bash
# Build and push queue metrics exporter
cd k8s/autoscaling
docker build -f Dockerfile.queue-exporter -t your-registry/queue-metrics-exporter:latest .
docker push your-registry/queue-metrics-exporter:latest

# Deploy HPAs
kubectl apply -f k8s/autoscaling/hpa-queue-based.yaml

# Verify
kubectl get hpa -n ai-models
```

### 6. Deploy Monitoring

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus and Grafana
kubectl apply -f k8s/monitoring/prometheus-grafana.yaml

# Deploy cost tracking
kubectl apply -f k8s/monitoring/cost-tracking.yaml

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
# Open http://localhost:3000 (admin/changeme)
```

## Architecture Overview

### GPU Infrastructure

- **Node Pools**: Separate pools for A100 and V100 GPUs
- **Autoscaling**: Cluster autoscaler scales nodes based on demand
- **GPU Sharing**: Time-slicing allows multiple workloads per GPU
- **Spot Instances**: V100 pools use spot instances for cost savings

### Model Services

- **STT**: Whisper + Pyannote (2-8 replicas)
- **MT**: Marian NMT (2-6 replicas)
- **TTS**: StyleTTS + XTTS (2-8 replicas each)
- **Lip-Sync**: Wav2Lip (1-6 replicas)

### Scaling Strategy

- **Queue-Based**: Scale based on Redis queue depth
- **GPU Utilization**: Scale based on GPU usage
- **Resource-Based**: Scale based on CPU/memory
- **Aggressive Scale-Up**: Quickly add capacity
- **Conservative Scale-Down**: Slowly remove capacity

### Cost Optimization

- **GPU Time-Slicing**: Share GPUs across workloads
- **Spot Instances**: 60-90% cost savings
- **Autoscaling**: Scale to zero when idle
- **Right-Sizing**: Match GPU type to workload
- **Cost Tracking**: Monitor and alert on budgets

## Key Features

### 1. High Availability

- Multiple replicas per service
- Pod disruption budgets
- Health checks and readiness probes
- Automatic pod restarts

### 2. Scalability

- Horizontal pod autoscaling
- Cluster autoscaling
- Queue-based scaling
- GPU sharing

### 3. Cost Efficiency

- Spot instance usage
- GPU time-slicing
- Automatic scale-down
- Cost monitoring and alerts

### 4. Observability

- Prometheus metrics
- Grafana dashboards
- Cost tracking
- Performance monitoring

### 5. Deployment Safety

- Blue-green deployments
- Rolling updates
- Automated rollbacks
- Health checks

## Resource Requirements

### Minimum Cluster

- 2 CPU nodes (n2-standard-4 or m5.xlarge)
- 1 GPU node (V100)
- Total cost: ~$3,000/month

### Recommended Production

- 2-4 CPU nodes
- 2-4 V100 GPU nodes
- 0-2 A100 GPU nodes (on-demand)
- Total cost: ~$8,000-15,000/month

### High-Scale Production

- 4-10 CPU nodes
- 4-8 V100 GPU nodes
- 2-4 A100 GPU nodes
- Total cost: ~$20,000-40,000/month

## Cost Breakdown

### GPU Instance Costs (per hour)

**GKE:**
- A100 (a2-highgpu-1g): $3.67/hour
- V100 (n1-standard-8): $2.48/hour

**EKS:**
- A100 (p4d.24xlarge): $32.77/hour (8 GPUs)
- V100 (p3.2xlarge): $3.06/hour

### Estimated Processing Costs

- STT (Whisper): $0.05-0.10 per minute
- MT (Marian): $0.01-0.02 per minute
- TTS (StyleTTS/XTTS): $0.08-0.15 per minute
- Lip-Sync (Wav2Lip): $0.10-0.20 per minute

**Total per video minute**: $0.24-0.47

## Monitoring

### Key Metrics

- GPU utilization by service
- Cost per hour/minute/job
- Queue depth and processing time
- Budget utilization
- Job completion rate

### Dashboards

Access Grafana dashboards for:
- Cost tracking and projections
- GPU performance
- Service health
- Budget alerts

### Alerts

Configured alerts for:
- Budget threshold exceeded
- High GPU costs
- Low GPU utilization
- High cost per job
- Idle GPUs

## Maintenance

### Regular Tasks

**Daily:**
- Monitor GPU utilization
- Check for failed jobs
- Review cost metrics

**Weekly:**
- Review scaling patterns
- Analyze cost trends
- Check for optimization opportunities

**Monthly:**
- Review budgets and adjust
- Update instance type selections
- Optimize resource allocations
- Review and update dashboards

### Updates

**Model Updates:**
```bash
# Blue-green deployment
kubectl apply -f k8s/blue-green/deployment-strategy.yaml

# Or rolling update
kubectl set image deployment/whisper-pyannote-stt \
  whisper-pyannote=your-registry/whisper-pyannote:v2.0 \
  -n ai-models
```

**Configuration Updates:**
```bash
# Update ConfigMap
kubectl edit configmap whisper-pyannote-config -n ai-models

# Restart pods to pick up changes
kubectl rollout restart deployment/whisper-pyannote-stt -n ai-models
```

## Troubleshooting

### Common Issues

1. **Pods not scheduling**: Check GPU node availability and taints
2. **High costs**: Review GPU utilization and scaling policies
3. **Low performance**: Check GPU memory and batch sizes
4. **Failed health checks**: Review model loading and dependencies

### Debug Commands

```bash
# Check pod status
kubectl get pods -n ai-models -o wide

# View logs
kubectl logs -n ai-models <pod-name> -f

# Describe pod
kubectl describe pod -n ai-models <pod-name>

# Check GPU allocation
kubectl describe nodes -l nvidia.com/gpu=true | grep -A 5 "Allocated resources"

# Check HPA status
kubectl get hpa -n ai-models
kubectl describe hpa <hpa-name> -n ai-models

# Check metrics
kubectl top nodes
kubectl top pods -n ai-models
```

## Security

### Best Practices

1. **Secrets Management**: Use external secrets manager
2. **Network Policies**: Restrict traffic between namespaces
3. **RBAC**: Least-privilege access
4. **Pod Security**: Enforce pod security standards
5. **Image Scanning**: Scan images for vulnerabilities

### Compliance

- Encryption at rest (storage)
- Encryption in transit (TLS)
- Audit logging enabled
- Access controls enforced

## Next Steps

1. **Production Deployment**: Follow deployment guides in each directory
2. **Monitoring Setup**: Configure Prometheus and Grafana
3. **Cost Optimization**: Review and implement cost-saving strategies
4. **CI/CD Integration**: Set up automated deployments
5. **Disaster Recovery**: Configure backups and recovery procedures

## Support

For detailed information on each component, see the README files in subdirectories:

- [Infrastructure Setup](infrastructure/README.md)
- [Model Deployments](deployments/README.md)
- [Autoscaling Configuration](autoscaling/README.md)
- [Monitoring and Cost Tracking](monitoring/README.md)

## Contributing

When adding new configurations:

1. Follow existing naming conventions
2. Include resource limits
3. Add health checks
4. Document in README
5. Test in staging first
