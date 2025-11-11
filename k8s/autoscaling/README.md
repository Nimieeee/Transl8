# Autoscaling Configuration

This directory contains Horizontal Pod Autoscaler (HPA) configurations for model services with queue-based scaling.

## Overview

The autoscaling system scales model inference services based on multiple metrics:

1. **GPU Utilization**: Scale based on GPU duty cycle
2. **CPU/Memory Utilization**: Scale based on resource usage
3. **Queue Depth**: Scale based on pending jobs in Redis queues (custom metric)
4. **Request Latency**: Scale based on response times (optional)

## Components

### 1. Queue Metrics Exporter

**File**: `queue-metrics-exporter.py`

A Python service that exports BullMQ queue metrics to Prometheus for HPA consumption.

**Metrics Exported**:
- `redis_queue_depth{queue_name, queue_type}` - Total jobs in queue
- `redis_queue_waiting{queue_name}` - Waiting jobs
- `redis_queue_active{queue_name}` - Active jobs
- `redis_queue_delayed{queue_name}` - Delayed jobs
- `redis_queue_failed{queue_name}` - Failed jobs

**Build and Deploy**:
```bash
# Build Docker image
docker build -f Dockerfile.queue-exporter -t your-registry/queue-metrics-exporter:latest .

# Push to registry
docker push your-registry/queue-metrics-exporter:latest

# Deploy to cluster
kubectl apply -f hpa-queue-based.yaml
```

### 2. Horizontal Pod Autoscalers

**File**: `hpa-queue-based.yaml`

HPA configurations for all model services with queue-based scaling.

## Scaling Policies

### STT Service (Whisper + Pyannote)

- **Min Replicas**: 2
- **Max Replicas**: 8
- **Scale Up**: 100% or 2 pods per minute
- **Scale Down**: 50% or 1 pod per 2 minutes
- **Triggers**:
  - GPU utilization > 80%
  - CPU utilization > 70%
  - Queue depth > 5 jobs per pod

### MT Service (Marian NMT)

- **Min Replicas**: 2
- **Max Replicas**: 6
- **Scale Up**: 100% or 2 pods per minute
- **Scale Down**: 50% per 2 minutes
- **Triggers**:
  - GPU utilization > 75%
  - CPU utilization > 70%
  - Queue depth > 10 jobs per pod

### TTS Services (StyleTTS + XTTS)

- **Min Replicas**: 2
- **Max Replicas**: 8
- **Scale Up**: 100% or 2 pods per minute
- **Scale Down**: 50% or 1 pod per 2 minutes
- **Triggers**:
  - GPU utilization > 80%
  - CPU utilization > 70%
  - Queue depth > 5 jobs per pod (StyleTTS)
  - Queue depth > 3 jobs per pod (XTTS, slower processing)

### Lip-Sync Service (Wav2Lip)

- **Min Replicas**: 1
- **Max Replicas**: 6
- **Scale Up**: 100% or 1 pod per 90 seconds
- **Scale Down**: 50% per 3 minutes
- **Triggers**:
  - GPU utilization > 75%
  - CPU utilization > 70%
  - Queue depth > 3 jobs per pod

## Prerequisites

### 1. Metrics Server

Install Kubernetes Metrics Server for CPU/Memory metrics:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify:
```bash
kubectl top nodes
kubectl top pods -n ai-models
```

### 2. Prometheus Adapter (for custom metrics)

Install Prometheus Adapter to expose custom metrics to HPA:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80
```

Configure adapter to expose queue metrics:

```yaml
# prometheus-adapter-config.yaml
rules:
  - seriesQuery: 'redis_queue_depth'
    resources:
      template: <<.Resource>>
    name:
      matches: "^redis_queue_depth$"
      as: "redis_queue_depth"
    metricsQuery: 'avg(redis_queue_depth{queue_name="<<.LabelMatchers>>",queue_type="total"}) by (queue_name)'
```

Apply configuration:
```bash
kubectl create configmap prometheus-adapter-config \
  --from-file=config.yaml=prometheus-adapter-config.yaml \
  -n monitoring

kubectl rollout restart deployment prometheus-adapter -n monitoring
```

### 3. NVIDIA DCGM Exporter (for GPU metrics)

Install NVIDIA DCGM Exporter for GPU metrics:

```bash
helm repo add gpu-helm-charts https://nvidia.github.io/dcgm-exporter/helm-charts
helm repo update

helm install dcgm-exporter gpu-helm-charts/dcgm-exporter \
  --namespace gpu-operator-resources \
  --create-namespace
```

## Deployment

### Deploy Queue Metrics Exporter

```bash
# Apply HPA configuration (includes exporter)
kubectl apply -f k8s/autoscaling/hpa-queue-based.yaml

# Verify exporter is running
kubectl get pods -n ai-models -l app=queue-metrics-exporter
kubectl logs -n ai-models -l app=queue-metrics-exporter

# Test metrics endpoint
kubectl port-forward -n ai-models svc/queue-metrics-exporter 9090:9090
curl http://localhost:9090/metrics
```

### Deploy HPAs

```bash
# Apply all HPAs
kubectl apply -f k8s/autoscaling/hpa-queue-based.yaml

# Verify HPAs
kubectl get hpa -n ai-models
kubectl describe hpa whisper-pyannote-stt-hpa -n ai-models
```

## Monitoring

### Check HPA Status

```bash
# List all HPAs
kubectl get hpa -n ai-models

# Watch HPA in real-time
kubectl get hpa -n ai-models -w

# Detailed HPA status
kubectl describe hpa whisper-pyannote-stt-hpa -n ai-models
```

### View Scaling Events

```bash
# View HPA events
kubectl get events -n ai-models --field-selector involvedObject.kind=HorizontalPodAutoscaler

# View deployment scaling events
kubectl get events -n ai-models --field-selector involvedObject.kind=Deployment
```

### Check Metrics

```bash
# CPU/Memory metrics
kubectl top pods -n ai-models

# Custom metrics (queue depth)
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/ai-models/redis_queue_depth?labelSelector=queue_name=stt-queue" | jq .

# GPU metrics (if DCGM exporter installed)
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/ai-models/pods/*/nvidia_gpu_duty_cycle" | jq .
```

## Testing

### Simulate Load

```bash
# Add jobs to queue to trigger scaling
kubectl run -it --rm redis-cli --image=redis:7 --restart=Never -- \
  redis-cli -h redis.default.svc.cluster.local

# In redis-cli:
> LPUSH bull:stt-queue:wait '{"jobId":"test-1","data":{}}'
> LPUSH bull:stt-queue:wait '{"jobId":"test-2","data":{}}'
# ... add more jobs

# Watch HPA scale up
kubectl get hpa -n ai-models -w
```

### Load Testing

```bash
# Use k6 or similar tool
k6 run --vus 10 --duration 5m load-test.js

# Monitor scaling
watch kubectl get pods -n ai-models
```

## Tuning

### Adjust Scaling Thresholds

Edit HPA to change thresholds:

```bash
kubectl edit hpa whisper-pyannote-stt-hpa -n ai-models
```

Example adjustments:
- Lower GPU threshold for more aggressive scaling
- Increase queue depth threshold for less aggressive scaling
- Adjust stabilization windows for faster/slower scaling

### Adjust Scaling Behavior

Modify scale-up/scale-down policies:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 30  # Faster scale-up
    policies:
      - type: Percent
        value: 200  # More aggressive
        periodSeconds: 30
  scaleDown:
    stabilizationWindowSeconds: 600  # Slower scale-down
```

## Troubleshooting

### HPA Not Scaling

1. Check metrics availability:
   ```bash
   kubectl get apiservice | grep metrics
   kubectl top pods -n ai-models
   ```

2. Check HPA conditions:
   ```bash
   kubectl describe hpa <hpa-name> -n ai-models
   ```

3. Check metrics server logs:
   ```bash
   kubectl logs -n kube-system -l k8s-app=metrics-server
   ```

### Custom Metrics Not Available

1. Check Prometheus Adapter:
   ```bash
   kubectl logs -n monitoring -l app=prometheus-adapter
   ```

2. Verify Prometheus is scraping metrics:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-server 9090:80
   # Open http://localhost:9090 and query redis_queue_depth
   ```

3. Check adapter configuration:
   ```bash
   kubectl get configmap prometheus-adapter-config -n monitoring -o yaml
   ```

### GPU Metrics Not Available

1. Check DCGM Exporter:
   ```bash
   kubectl get pods -n gpu-operator-resources
   kubectl logs -n gpu-operator-resources -l app=dcgm-exporter
   ```

2. Verify GPU nodes have DCGM:
   ```bash
   kubectl describe node <gpu-node> | grep dcgm
   ```

## Cost Optimization

### Scaling Strategy

1. **Aggressive Scale-Up**: Quickly add capacity to handle load spikes
2. **Conservative Scale-Down**: Slowly remove capacity to avoid thrashing
3. **Minimum Replicas**: Keep minimum replicas to handle baseline load
4. **Maximum Replicas**: Cap maximum to control costs

### Queue-Based Scaling Benefits

- **Predictive**: Scale based on pending work, not just current load
- **Efficient**: Avoid over-provisioning by scaling to actual demand
- **Cost-Effective**: Scale down when queues are empty

### Monitoring Costs

Track scaling costs:

```bash
# Count pod-hours by service
kubectl get pods -n ai-models -o json | \
  jq -r '.items[] | "\(.metadata.labels.app) \(.status.startTime)"'

# Monitor node usage
kubectl top nodes
```

## Next Steps

1. Set up monitoring dashboards: See `k8s/monitoring/`
2. Configure cost tracking: See subtask 18.4
3. Implement alerting: See `k8s/monitoring/alerts.yaml`
4. Optimize resource requests: Monitor actual usage and adjust
