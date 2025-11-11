# Kubernetes Deployments for AI Model Services

This directory contains production-ready Kubernetes deployment manifests for all AI model inference services.

## Services

### 1. Whisper + Pyannote STT Service
**File**: `whisper-pyannote-stt.yaml`

Speech-to-text transcription with speaker diarization.

**Models**:
- OpenAI Whisper large-v3
- Pyannote.audio 3.0 speaker diarization

**Resources**:
- CPU: 4-8 cores
- Memory: 16-32 GB
- GPU: 1x V100 or A100
- Storage: 50 GB

**Replicas**: 2 (high-priority workload)

### 2. Marian NMT Translation Service
**File**: `marian-mt.yaml`

Machine translation using Helsinki-NLP Marian models.

**Models**:
- Helsinki-NLP opus-mt models for multiple language pairs

**Resources**:
- CPU: 2-4 cores
- Memory: 8-16 GB
- GPU: 1x V100 or A100
- Storage: 30 GB

**Replicas**: 2 (medium-priority workload)

### 3. StyleTTS 2 Service
**File**: `styletts-tts.yaml`

High-quality text-to-speech synthesis with preset voices.

**Models**:
- StyleTTS 2

**Resources**:
- CPU: 4-8 cores
- Memory: 16-32 GB
- GPU: 1x V100 or A100
- Storage: 40 GB

**Replicas**: 2 (high-priority workload)

### 4. XTTS-v2 Voice Cloning Service
**File**: `xtts-tts.yaml`

Zero-shot voice cloning for custom voices.

**Models**:
- Coqui XTTS-v2

**Resources**:
- CPU: 4-8 cores
- Memory: 16-32 GB
- GPU: 1x V100 or A100
- Storage: 40 GB

**Replicas**: 2 (high-priority workload)

### 5. Wav2Lip Lip-Sync Service
**File**: `wav2lip-lipsync.yaml`

Lip synchronization with face restoration.

**Models**:
- Wav2Lip GAN
- GFPGAN v1.3

**Resources**:
- CPU: 4-8 cores
- Memory: 16-32 GB
- GPU: 1x V100 or A100
- Storage: 30 GB (models) + 30 GB (temp)

**Replicas**: 2 (medium-priority workload)

## Prerequisites

1. Kubernetes cluster with GPU nodes (see `k8s/infrastructure/`)
2. NVIDIA device plugin installed
3. `ai-models` namespace created
4. Secrets configured with cloud credentials

## Configuration

### Secrets

Before deploying, create secrets with your credentials:

```bash
# Create namespace
kubectl create namespace ai-models

# Whisper + Pyannote secrets
kubectl create secret generic whisper-pyannote-secrets \
  --from-literal=HF_TOKEN=your-huggingface-token \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  -n ai-models

# Marian MT secrets
kubectl create secret generic marian-mt-secrets \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  -n ai-models

# StyleTTS secrets
kubectl create secret generic styletts-secrets \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  -n ai-models

# XTTS secrets
kubectl create secret generic xtts-secrets \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  -n ai-models

# Wav2Lip secrets
kubectl create secret generic wav2lip-secrets \
  --from-literal=AWS_ACCESS_KEY_ID=your-aws-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-aws-secret \
  -n ai-models
```

### ConfigMaps

ConfigMaps are included in each deployment file. Modify them as needed:

```bash
# Edit configuration
kubectl edit configmap whisper-pyannote-config -n ai-models
kubectl edit configmap marian-mt-config -n ai-models
kubectl edit configmap styletts-config -n ai-models
kubectl edit configmap xtts-config -n ai-models
kubectl edit configmap wav2lip-config -n ai-models
```

## Deployment

### Deploy All Services

```bash
# Apply all deployments
kubectl apply -f k8s/deployments/

# Verify deployments
kubectl get deployments -n ai-models
kubectl get pods -n ai-models
kubectl get services -n ai-models
```

### Deploy Individual Services

```bash
# Deploy STT service
kubectl apply -f k8s/deployments/whisper-pyannote-stt.yaml

# Deploy MT service
kubectl apply -f k8s/deployments/marian-mt.yaml

# Deploy TTS services
kubectl apply -f k8s/deployments/styletts-tts.yaml
kubectl apply -f k8s/deployments/xtts-tts.yaml

# Deploy lip-sync service
kubectl apply -f k8s/deployments/wav2lip-lipsync.yaml
```

## Monitoring

### Check Pod Status

```bash
# List all pods
kubectl get pods -n ai-models -o wide

# Watch pod status
kubectl get pods -n ai-models -w

# Check specific service
kubectl get pods -n ai-models -l app=whisper-pyannote-stt
```

### View Logs

```bash
# View logs for a service
kubectl logs -n ai-models -l app=whisper-pyannote-stt --tail=100 -f

# View logs for specific pod
kubectl logs -n ai-models <pod-name> -f

# View init container logs
kubectl logs -n ai-models <pod-name> -c model-downloader
```

### Check Resource Usage

```bash
# Pod resource usage
kubectl top pods -n ai-models

# Node resource usage
kubectl top nodes

# GPU allocation
kubectl describe nodes -l nvidia.com/gpu=true | grep -A 5 "Allocated resources"
```

### Health Checks

```bash
# Check service endpoints
kubectl get endpoints -n ai-models

# Test health endpoint
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://whisper-pyannote-stt.ai-models.svc.cluster.local:8000/health
```

## Scaling

### Manual Scaling

```bash
# Scale up
kubectl scale deployment whisper-pyannote-stt -n ai-models --replicas=4

# Scale down
kubectl scale deployment marian-mt -n ai-models --replicas=1
```

### Horizontal Pod Autoscaling

HPA configurations are in `k8s/autoscaling/` (see subtask 18.3).

## Updating

### Rolling Update

```bash
# Update image
kubectl set image deployment/whisper-pyannote-stt \
  whisper-pyannote=your-registry/whisper-pyannote:v2.0 \
  -n ai-models

# Check rollout status
kubectl rollout status deployment/whisper-pyannote-stt -n ai-models

# View rollout history
kubectl rollout history deployment/whisper-pyannote-stt -n ai-models
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/whisper-pyannote-stt -n ai-models

# Rollback to specific revision
kubectl rollout undo deployment/whisper-pyannote-stt -n ai-models --to-revision=2
```

## Troubleshooting

### Pods Not Starting

1. Check pod events:
   ```bash
   kubectl describe pod <pod-name> -n ai-models
   ```

2. Common issues:
   - **ImagePullBackOff**: Check image registry credentials
   - **CrashLoopBackOff**: Check application logs
   - **Pending**: Check resource availability and node affinity

### GPU Not Available

1. Check GPU nodes:
   ```bash
   kubectl get nodes -l nvidia.com/gpu=true
   ```

2. Check NVIDIA device plugin:
   ```bash
   kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds
   ```

3. Verify GPU resources:
   ```bash
   kubectl describe node <gpu-node-name> | grep nvidia.com/gpu
   ```

### Model Download Failures

1. Check init container logs:
   ```bash
   kubectl logs <pod-name> -n ai-models -c model-downloader
   ```

2. Verify network connectivity and credentials

### Service Not Responding

1. Check service endpoints:
   ```bash
   kubectl get endpoints <service-name> -n ai-models
   ```

2. Test connectivity:
   ```bash
   kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
     curl -v http://<service-name>.ai-models.svc.cluster.local:8000/health
   ```

## Performance Tuning

### Batch Size Optimization

Adjust batch sizes in ConfigMaps based on GPU memory:

- **V100 (16GB)**: Lower batch sizes
- **A100 (40GB/80GB)**: Higher batch sizes

### GPU Time-Slicing

GPU time-slicing is configured in `k8s/infrastructure/gpu-sharing-config.yaml`:
- A100: 4 concurrent workloads
- V100: 2 concurrent workloads

### Resource Limits

Adjust resource requests/limits based on actual usage:

```bash
# Monitor actual usage
kubectl top pods -n ai-models --containers

# Update resources
kubectl edit deployment <deployment-name> -n ai-models
```

## Security

### Network Policies

Network policies are defined in `k8s/infrastructure/resource-quotas.yaml`.

### Pod Security

All deployments follow security best practices:
- Non-root containers where possible
- Read-only root filesystem where possible
- Resource limits enforced
- Secrets mounted as environment variables

### Image Security

Scan images for vulnerabilities:

```bash
# Using Trivy
trivy image your-registry/whisper-pyannote:latest
```

## Cost Optimization

1. **Use Spot/Preemptible Instances**: V100 node pools configured with spot instances
2. **GPU Time-Slicing**: Share GPUs across multiple workloads
3. **Autoscaling**: Scale down during low usage
4. **Right-Sizing**: Monitor and adjust resource requests/limits

## Next Steps

1. Configure autoscaling: See `k8s/autoscaling/`
2. Set up monitoring: See `k8s/monitoring/`
3. Configure ingress: See `k8s/ingress/`
4. Set up CI/CD: See `.github/workflows/`
