#!/bin/bash

# Staging Environment Setup Script
# This script sets up the staging environment in Kubernetes

set -e

echo "=========================================="
echo "Setting up Staging Environment"
echo "=========================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check if we're connected to the right cluster
echo "Current cluster context:"
kubectl config current-context

read -p "Is this the correct cluster for staging? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Please switch to the correct cluster context and try again"
    exit 1
fi

# Create namespace and resource quotas
echo ""
echo "Creating namespace and resource quotas..."
kubectl apply -f namespace.yaml

# Create secrets (you'll need to update these with actual values)
echo ""
echo "⚠️  WARNING: Update secrets with actual values before proceeding!"
echo "Edit the following files and replace REPLACE_WITH_ACTUAL_* placeholders:"
echo "  - database.yaml (postgres credentials)"
echo "  - storage.yaml (S3 credentials)"
echo "  - backend.yaml (JWT secrets, Sentry DSN, DataDog key)"
echo ""
read -p "Have you updated all secrets? (yes/no): " secrets_confirm
if [ "$secrets_confirm" != "yes" ]; then
    echo "Please update secrets and run this script again"
    exit 1
fi

# Deploy PostgreSQL
echo ""
echo "Deploying PostgreSQL..."
kubectl apply -f database.yaml

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n staging --timeout=300s

# Deploy Redis
echo ""
echo "Deploying Redis..."
kubectl apply -f redis.yaml

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n staging --timeout=300s

# Create storage configuration
echo ""
echo "Creating storage configuration..."
kubectl apply -f storage.yaml

# Deploy backend
echo ""
echo "Deploying backend..."
kubectl apply -f backend.yaml

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
kubectl wait --for=condition=available deployment/backend -n staging --timeout=300s

# Deploy frontend
echo ""
echo "Deploying frontend..."
kubectl apply -f frontend.yaml

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
kubectl wait --for=condition=available deployment/frontend -n staging --timeout=300s

# Deploy workers
echo ""
echo "Deploying workers..."
kubectl apply -f workers.yaml

# Wait for workers to be ready
echo "Waiting for workers to be ready..."
kubectl wait --for=condition=available deployment/workers -n staging --timeout=300s

# Deploy ingress
echo ""
echo "Deploying ingress..."
kubectl apply -f ingress.yaml

# Display deployment status
echo ""
echo "=========================================="
echo "Staging Environment Setup Complete!"
echo "=========================================="
echo ""
echo "Deployment Status:"
kubectl get deployments -n staging
echo ""
echo "Services:"
kubectl get services -n staging
echo ""
echo "Ingress:"
kubectl get ingress -n staging
echo ""
echo "Pods:"
kubectl get pods -n staging
echo ""
echo "=========================================="
echo "Next Steps:"
echo "1. Run database migrations:"
echo "   kubectl run prisma-migrate --rm -i --tty --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:develop --restart=Never --env=\"DATABASE_URL=postgresql://dubbing_staging:PASSWORD@postgres-service:5432/dubbing_staging\" -n staging -- npm run prisma:migrate:deploy"
echo ""
echo "2. Verify health endpoints:"
echo "   curl https://staging-api.dubbing-platform.example.com/health"
echo ""
echo "3. Check logs if needed:"
echo "   kubectl logs -f deployment/backend -n staging"
echo "   kubectl logs -f deployment/frontend -n staging"
echo "   kubectl logs -f deployment/workers -n staging"
echo "=========================================="
