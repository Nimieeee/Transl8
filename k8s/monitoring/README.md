# Monitoring and Cost Tracking

This directory contains monitoring and cost tracking configurations for the AI Video Dubbing Platform GPU infrastructure.

## Overview

The monitoring system provides:

1. **GPU Utilization Monitoring**: Track GPU usage across all model services
2. **Cost Tracking**: Calculate and project costs based on GPU usage
3. **Performance Metrics**: Monitor job processing times and throughput
4. **Budget Alerts**: Alert when services exceed budget thresholds
5. **Optimization Recommendations**: Identify cost-saving opportunities

## Components

### 1. Prometheus

**File**: `prometheus-grafana.yaml`

Prometheus collects metrics from:
- Kubernetes API server
- Kubernetes nodes and pods
- NVIDIA DCGM Exporter (GPU metrics)
- Queue Metrics Exporter (job queue depth)
- Model service endpoints (application metrics)

**Retention**: 30 days

### 2. Grafana

**File**: `prometheus-grafana.yaml`

Grafana provides visualization dashboards for:
- Cost tracking and projections
- GPU utilization and performance
- Job processing metrics
- Budget utilization

**Default Credentials**:
- Username: `admin`
- Password: `changeme` (change this!)

### 3. Cost Tracking Exporter

**Files**: 
- `cost-tracking-exporter.py`
- `Dockerfile.cost-exporter`
- `cost-tracking.yaml`

Custom exporter that calculates:
- Cost per hour by service
- Cost per processing minute
- Monthly cost projections
- Budget utilization percentages
- Cost per job

### 4. NVIDIA DCGM Exporter

Exports GPU metrics including:
- GPU utilization
- GPU memory usage
- GPU temperature
- Power consumption

## Prerequisites

### 1. Install NVIDIA DCGM Exporter

```bash
helm repo add gpu-helm-charts https://nvidia.github.io/dcgm-exporter/helm-charts
helm repo update

helm install dcgm-exporter gpu-helm-charts/dcgm-exporter \
  --namespace gpu-operator-resources \
  --create-namespace \
  --set serviceMonitor.enabled=true
```

Verify:
```bash
kubectl get pods -n gpu-operator-resources
kubectl logs -n gpu-operator-resources -l app=dcgm-exporter
```

### 2. Configure GPU Costs

Edit `cost-tracking.yaml` to set your actual GPU instance costs:

```yaml
data:
  gpu_costs.json: |
    {
      "gke": {
        "a2-highgpu-1g": 3.67,
        "n1-standard-8-v100": 2.48
      },
      "eks": {
        "p4d.24xlarge": 32.77,
        "p3.2xlarge": 3.06
      }
    }
```

### 3. Configure Budgets

Edit `cost-tracking.yaml` to set monthly budgets per service:

```yaml
data:
  cost_allocation.json: |
    {
      "whisper-pyannote-stt": {
        "budget_monthly": 5000,
        "alert_threshold": 0.8
      }
    }
```

## Deployment

### Deploy Monitoring Stack

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus and Grafana
kubectl apply -f k8s/monitoring/prometheus-grafana.yaml

# Deploy cost tracking
kubectl apply -f k8s/monitoring/cost-tracking.yaml

# Verify deployments
kubectl get pods -n monitoring
```

### Build and Deploy Cost Exporter

```bash
# Build Docker image
cd k8s/monitoring
docker build -f Dockerfile.cost-exporter -t your-registry/cost-tracking-exporter:latest .

# Push to registry
docker push your-registry/cost-tracking-exporter:latest

# Update image in cost-tracking.yaml and apply
kubectl apply -f cost-tracking.yaml
```

### Access Grafana

```bash
# Get Grafana URL (if using LoadBalancer)
kubectl get svc grafana -n monitoring

# Or port-forward
kubectl port-forward -n monitoring svc/grafana 3000:80

# Open http://localhost:3000
# Login with admin/changeme
```

### Import Dashboards

```bash
# Create ConfigMap with dashboard
kubectl create configmap grafana-dashboards \
  --from-file=cost-dashboard.json=grafana-dashboards.json \
  -n monitoring

# Restart Grafana to load dashboard
kubectl rollout restart deployment/grafana -n monitoring
```

## Metrics

### GPU Metrics (from DCGM Exporter)

- `DCGM_FI_DEV_GPU_UTIL` - GPU utilization percentage
- `DCGM_FI_DEV_FB_USED` - GPU memory used (MB)
- `DCGM_FI_DEV_FB_FREE` - GPU memory free (MB)
- `DCGM_FI_DEV_GPU_TEMP` - GPU temperature (°C)
- `DCGM_FI_DEV_POWER_USAGE` - Power usage (W)

### Cost Metrics (from Cost Exporter)

- `gpu_cost_per_hour{node, instance_type, gpu_type}` - Cost per hour per node
- `service_cost_per_hour{service, namespace}` - Cost per hour per service
- `service_cost_per_minute{service, namespace}` - Cost per minute per service
- `monthly_cost_projection{service, namespace}` - Projected monthly cost
- `budget_utilization_percentage{service, namespace}` - Budget utilization %
- `cost_per_job{service, queue_name}` - Cost per job
- `total_gpu_hours{service, gpu_type}` - Cumulative GPU hours

### Queue Metrics (from Queue Exporter)

- `redis_queue_depth{queue_name, queue_type}` - Jobs in queue
- `redis_queue_waiting{queue_name}` - Waiting jobs
- `redis_queue_active{queue_name}` - Active jobs
- `redis_queue_failed{queue_name}` - Failed jobs

## Queries

### Useful Prometheus Queries

```promql
# Total monthly cost projection
sum(monthly_cost_projection)

# Cost by service
sum by (service) (service_cost_per_hour)

# Average GPU utilization
avg(DCGM_FI_DEV_GPU_UTIL{kubernetes_namespace="ai-models"})

# GPU utilization by service
avg by (app) (DCGM_FI_DEV_GPU_UTIL{kubernetes_namespace="ai-models"})

# Jobs processed per hour
sum by (app) (rate(job_completed_total[1h]) * 3600)

# Cost per job
cost_per_job

# Budget utilization over threshold
budget_utilization_percentage > 80

# Low GPU utilization (potential waste)
DCGM_FI_DEV_GPU_UTIL < 30

# GPU memory usage percentage
(DCGM_FI_DEV_FB_USED / (DCGM_FI_DEV_FB_USED + DCGM_FI_DEV_FB_FREE)) * 100
```

## Alerts

### Cost Alerts

Configured in `cost-tracking.yaml`:

1. **BudgetThresholdExceeded**: Service exceeds 80% of monthly budget
2. **HighGPUCost**: Service costs >$50/hour
3. **LowGPUUtilization**: GPU utilization <30% for 1 hour
4. **HighCostPerJob**: Cost per job >$0.50
5. **IdleGPU**: GPU idle but pods running

### Configure Alert Notifications

```bash
# Create secret with Slack webhook
kubectl create secret generic alert-secrets \
  --from-literal=slack-webhook-url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -n monitoring

# Or PagerDuty integration key
kubectl create secret generic alert-secrets \
  --from-literal=pagerduty-key=YOUR_PAGERDUTY_KEY \
  -n monitoring
```

## Cost Optimization

### Automatic Optimization

The cost optimization CronJob runs every 6 hours and:

1. Analyzes GPU utilization patterns
2. Identifies underutilized resources
3. Recommends scaling adjustments
4. Suggests spot instance usage
5. Generates cost reports

### Manual Optimization

#### 1. Review GPU Utilization

```bash
# Check current utilization
kubectl top nodes

# View detailed metrics
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Query: DCGM_FI_DEV_GPU_UTIL
```

#### 2. Identify Low Utilization

```promql
# Services with <50% GPU utilization
avg by (app) (DCGM_FI_DEV_GPU_UTIL{kubernetes_namespace="ai-models"}) < 50
```

**Actions**:
- Scale down replicas
- Use smaller GPU instances (V100 instead of A100)
- Enable GPU time-slicing

#### 3. Optimize Instance Types

```bash
# Check instance types in use
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, type: .metadata.labels["node.kubernetes.io/instance-type"]}'
```

**Recommendations**:
- Use V100 for MT and Lip-Sync (lower cost)
- Use A100 for STT and TTS (higher performance needed)
- Use spot instances for non-critical workloads

#### 4. Enable Spot Instances

For GKE:
```bash
gcloud container node-pools update gpu-v100-pool \
  --cluster ai-dubbing-production \
  --region us-central1 \
  --enable-autoscaling \
  --spot
```

For EKS:
```yaml
# In eks-cluster.yaml
instancesDistribution:
  onDemandPercentageAboveBaseCapacity: 0  # 100% spot
```

### Cost Savings Strategies

1. **GPU Time-Slicing**: Share GPUs across multiple workloads (configured in `gpu-sharing-config.yaml`)
2. **Autoscaling**: Scale down during low usage (configured in `hpa-queue-based.yaml`)
3. **Spot Instances**: Use spot/preemptible instances for 60-90% savings
4. **Right-Sizing**: Match GPU type to workload requirements
5. **Batch Processing**: Process multiple jobs together to maximize GPU utilization

## Monitoring Best Practices

### 1. Set Realistic Budgets

Base budgets on:
- Expected processing volume
- Average job processing time
- GPU instance costs
- Buffer for growth (20-30%)

### 2. Monitor Trends

Track over time:
- Cost per job trends
- GPU utilization patterns
- Queue depth patterns
- Processing time trends

### 3. Regular Reviews

Schedule monthly reviews to:
- Analyze cost reports
- Identify optimization opportunities
- Adjust budgets and thresholds
- Update instance type selections

### 4. Alert Tuning

Adjust alert thresholds based on:
- Actual usage patterns
- Business requirements
- Cost tolerance

## Troubleshooting

### Metrics Not Appearing

1. Check Prometheus targets:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   # Open http://localhost:9090/targets
   ```

2. Check DCGM Exporter:
   ```bash
   kubectl logs -n gpu-operator-resources -l app=dcgm-exporter
   ```

3. Check Cost Exporter:
   ```bash
   kubectl logs -n monitoring -l app=cost-tracking-exporter
   ```

### Incorrect Cost Calculations

1. Verify GPU costs in ConfigMap:
   ```bash
   kubectl get configmap cost-config -n monitoring -o yaml
   ```

2. Check instance type labels:
   ```bash
   kubectl get nodes --show-labels | grep instance-type
   ```

3. Verify Prometheus queries:
   ```bash
   # Test query
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   # Query: kube_node_labels{label_node_kubernetes_io_instance_type=~".*"}
   ```

### Grafana Dashboard Not Loading

1. Check Grafana logs:
   ```bash
   kubectl logs -n monitoring -l app=grafana
   ```

2. Verify datasource:
   ```bash
   kubectl get configmap grafana-datasources -n monitoring -o yaml
   ```

3. Re-import dashboard:
   ```bash
   kubectl delete configmap grafana-dashboards -n monitoring
   kubectl create configmap grafana-dashboards \
     --from-file=cost-dashboard.json=grafana-dashboards.json \
     -n monitoring
   kubectl rollout restart deployment/grafana -n monitoring
   ```

## Next Steps

1. Set up alerting: Configure Slack/PagerDuty webhooks
2. Create custom dashboards: Add service-specific metrics
3. Implement cost allocation: Tag resources by team/project
4. Set up log aggregation: See backend logging configuration
5. Configure backup: Set up Prometheus and Grafana backups
