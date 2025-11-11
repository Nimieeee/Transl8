# Kubernetes Infrastructure Configuration

This directory contains Kubernetes infrastructure configurations for deploying the AI Video Dubbing Platform on production GPU-enabled clusters.

## Overview

The infrastructure supports both Google Kubernetes Engine (GKE) and Amazon Elastic Kubernetes Service (EKS) with GPU node pools optimized for AI model inference workloads.

## Files

- `gke-cluster.yaml` - GKE cluster configuration with GPU node pools
- `eks-cluster.yaml` - EKS cluster configuration with GPU node groups
- `resource-quotas.yaml` - Resource quotas and limits per model service
- `gpu-sharing-config.yaml` - GPU time-slicing and autoscaling configuration

## Prerequisites

### For GKE

1. Install `gcloud` CLI and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Enable required APIs:
   ```bash
   gcloud services enable container.googleapis.com
   gcloud services enable compute.googleapis.com
   ```

3. Install Config Connector (optional, for declarative cluster management):
   ```bash
   gcloud services enable cloudresourcemanager.googleapis.com
   ```

### For EKS

1. Install `eksctl` CLI:
   ```bash
   # macOS
   brew install eksctl
   
   # Linux
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   ```

2. Configure AWS credentials:
   ```bash
   aws configure
   ```

## Deployment

### Deploy GKE Cluster

1. Update the `PROJECT_ID` placeholder in `gke-cluster.yaml`:
   ```bash
   sed -i 's/PROJECT_ID/your-actual-project-id/g' k8s/infrastructure/gke-cluster.yaml
   ```

2. Create the cluster using gcloud:
   ```bash
   # Create cluster
   gcloud container clusters create ai-dubbing-production \
     --region us-central1 \
     --enable-autoscaling \
     --min-nodes 1 \
     --max-nodes 10 \
     --machine-type n2-standard-4 \
     --enable-stackdriver-kubernetes \
     --addons GcePersistentDiskCsiDriver
   
   # Add GPU node pool (A100)
   gcloud container node-pools create gpu-a100-pool \
     --cluster ai-dubbing-production \
     --region us-central1 \
     --machine-type a2-highgpu-1g \
     --accelerator type=nvidia-tesla-a100,count=1,gpu-sharing-config=max-shared-clients-per-gpu=4 \
     --num-nodes 0 \
     --enable-autoscaling \
     --min-nodes 0 \
     --max-nodes 4 \
     --node-taints nvidia.com/gpu=true:NoSchedule \
     --node-labels workload-type=ai-inference,gpu-type=a100,tier=premium
   
   # Add GPU node pool (V100)
   gcloud container node-pools create gpu-v100-pool \
     --cluster ai-dubbing-production \
     --region us-central1 \
     --machine-type n1-standard-8 \
     --accelerator type=nvidia-tesla-v100,count=1,gpu-sharing-config=max-shared-clients-per-gpu=2 \
     --num-nodes 1 \
     --enable-autoscaling \
     --min-nodes 1 \
     --max-nodes 8 \
     --spot \
     --node-taints nvidia.com/gpu=true:NoSchedule \
     --node-labels workload-type=ai-inference,gpu-type=v100,tier=standard
   ```

3. Get cluster credentials:
   ```bash
   gcloud container clusters get-credentials ai-dubbing-production --region us-central1
   ```

### Deploy EKS Cluster

1. Create the cluster using eksctl:
   ```bash
   eksctl create cluster -f k8s/infrastructure/eks-cluster.yaml
   ```

2. Verify cluster creation:
   ```bash
   kubectl get nodes
   ```

### Install GPU Support

1. Install NVIDIA device plugin:
   ```bash
   kubectl apply -f k8s/infrastructure/gpu-sharing-config.yaml
   ```

2. Verify GPU nodes are ready:
   ```bash
   kubectl get nodes -l nvidia.com/gpu=true
   kubectl describe node <gpu-node-name> | grep nvidia.com/gpu
   ```

### Apply Resource Quotas

```bash
kubectl apply -f k8s/infrastructure/resource-quotas.yaml
```

Verify quotas:
```bash
kubectl get resourcequota -n ai-models
kubectl describe resourcequota -n ai-models
```

## GPU Sharing Configuration

The cluster is configured with GPU time-slicing to allow multiple workloads to share a single GPU:

- **A100 GPUs**: Up to 4 concurrent workloads per GPU
- **V100 GPUs**: Up to 2 concurrent workloads per GPU

This maximizes GPU utilization for inference workloads that don't require full GPU capacity.

## Autoscaling

### Cluster Autoscaler

The cluster autoscaler automatically adjusts the number of nodes based on:

- Pending pods that cannot be scheduled due to resource constraints
- Node utilization falling below threshold (50%)
- Job queue depth (via custom metrics)

Configuration:
- Scale-up: Triggered when pods are pending for >30 seconds
- Scale-down: Triggered when node utilization <50% for >10 minutes
- Priority: A100 nodes > V100 nodes > CPU nodes

### Horizontal Pod Autoscaler (HPA)

HPA will be configured per model service deployment (see `k8s/deployments/`) to scale based on:
- CPU/Memory utilization
- Custom metrics (queue depth, request latency)

## Resource Quotas

Resource quotas are enforced per model service type:

| Service | CPU Limit | Memory Limit | GPU Limit |
|---------|-----------|--------------|-----------|
| STT     | 64 cores  | 256 GB       | 4 GPUs    |
| MT      | 32 cores  | 128 GB       | 2 GPUs    |
| TTS     | 64 cores  | 256 GB       | 4 GPUs    |
| Lip-Sync| 32 cores  | 128 GB       | 2 GPUs    |

## Cost Optimization

1. **Spot/Preemptible Instances**: V100 node pools use spot instances for 60-90% cost savings
2. **GPU Time-Slicing**: Allows multiple workloads per GPU, reducing total GPU count needed
3. **Autoscaling**: Scales down to minimum nodes during low usage periods
4. **Node Affinity**: Routes workloads to appropriate GPU types based on performance requirements

## Monitoring

Monitor cluster health and GPU utilization:

```bash
# Node status
kubectl get nodes -o wide

# GPU allocation
kubectl get nodes -o json | jq '.items[] | {name: .metadata.name, gpu: .status.allocatable["nvidia.com/gpu"]}'

# Resource usage
kubectl top nodes
kubectl top pods -n ai-models

# Autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler
```

## Troubleshooting

### GPU nodes not appearing

1. Check node pool status:
   ```bash
   # GKE
   gcloud container node-pools list --cluster ai-dubbing-production --region us-central1
   
   # EKS
   eksctl get nodegroup --cluster ai-dubbing-production
   ```

2. Check NVIDIA device plugin:
   ```bash
   kubectl get pods -n kube-system -l name=nvidia-device-plugin-ds
   kubectl logs -n kube-system -l name=nvidia-device-plugin-ds
   ```

### Pods not scheduling on GPU nodes

1. Check node taints and pod tolerations:
   ```bash
   kubectl describe node <gpu-node-name> | grep Taints
   ```

2. Verify GPU resource requests in pod spec:
   ```yaml
   resources:
     limits:
       nvidia.com/gpu: 1
   ```

### Autoscaler not scaling

1. Check autoscaler logs:
   ```bash
   kubectl logs -n kube-system -l app=cluster-autoscaler --tail=100
   ```

2. Verify node group tags (EKS) or labels (GKE):
   ```bash
   kubectl get nodes --show-labels
   ```

## Security Considerations

1. **Node Security**: All nodes use shielded instances with secure boot
2. **Network Policies**: Restrict traffic between namespaces
3. **RBAC**: Least-privilege access for service accounts
4. **Secrets Management**: Use external secrets manager (AWS Secrets Manager, GCP Secret Manager)
5. **Pod Security**: Enforce pod security standards

## Next Steps

After deploying the infrastructure:

1. Deploy model services: See `k8s/deployments/`
2. Configure monitoring: See `k8s/monitoring/`
3. Set up CI/CD: See `.github/workflows/`
4. Configure ingress and load balancing: See `k8s/ingress/`
