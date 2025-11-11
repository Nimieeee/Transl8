#!/bin/bash

# Production Environment Setup Script
# This script sets up the production environment in Kubernetes with blue-green deployment

set -e

echo "=========================================="
echo "Setting up Production Environment"
echo "=========================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check if we're connected to the right cluster
echo "Current cluster context:"
kubectl config current-context

read -p "⚠️  Is this the PRODUCTION cluster? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Please switch to the correct cluster context and try again"
    exit 1
fi

# Additional safety check
read -p "⚠️  This will deploy to PRODUCTION. Are you absolutely sure? (type 'PRODUCTION' to confirm): " safety_confirm
if [ "$safety_confirm" != "PRODUCTION" ]; then
    echo "Deployment cancelled for safety"
    exit 1
fi

# Create namespace and resource quotas
echo ""
echo "Creating namespace and resource quotas..."
kubectl apply -f namespace.yaml

# Create secrets (you'll need to update these with actual values)
echo ""
echo "⚠️  CRITICAL: Update secrets with actual production values!"
echo "Edit the following files and replace REPLACE_WITH_ACTUAL_* placeholders:"
echo "  - database.yaml (postgres credentials)"
echo "  - storage.yaml (S3 credentials)"
echo "  - backend-blue-green.yaml (JWT secrets, Sentry DSN, DataDog key)"
echo ""
read -p "Have you updated all secrets with production values? (yes/no): " secrets_confirm
if [ "$secrets_confirm" != "yes" ]; then
    echo "Please update secrets and run this script again"
    exit 1
fi

# Deploy PostgreSQL (or configure external database)
echo ""
echo "⚠️  For production, we recommend using a managed database service like AWS RDS"
read -p "Are you using a managed database service? (yes/no): " managed_db
if [ "$managed_db" == "yes" ]; then
    echo "Please ensure you've created an ExternalName service pointing to your managed database"
    echo "Example in database.yaml (commented out)"
    read -p "Press enter to continue..."
else
    echo "Deploying self-hosted PostgreSQL..."
    kubectl apply -f database.yaml
    echo "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=300s
fi

# Deploy Redis
echo ""
echo "Deploying Redis cluster..."
kubectl apply -f redis.yaml

# Wait for Redis master to be ready
echo "Waiting for Redis master to be ready..."
kubectl wait --for=condition=ready pod -l app=redis,role=master -n production --timeout=300s

# Create storage configuration
echo ""
echo "Creating storage configuration..."
kubectl apply -f storage.yaml

echo ""
echo "⚠️  Don't forget to configure S3 lifecycle policies!"
echo "See storage.yaml for the lifecycle configuration JSON"

# Deploy backend (blue-green)
echo ""
echo "Deploying backend (blue-green)..."
kubectl apply -f backend-blue-green.yaml

# Wait for blue backend to be ready
echo "Waiting for blue backend to be ready..."
kubectl wait --for=condition=available deployment/backend-blue -n production --timeout=300s

# Deploy frontend (blue-green)
echo ""
echo "Deploying frontend (blue-green)..."
kubectl apply -f frontend-blue-green.yaml

# Wait for blue frontend to be ready
echo "Waiting for blue frontend to be ready..."
kubectl wait --for=condition=available deployment/frontend-blue -n production --timeout=300s

# Deploy workers (blue-green)
echo ""
echo "Deploying workers (blue-green)..."
kubectl apply -f workers-blue-green.yaml

# Wait for blue workers to be ready
echo "Waiting for blue workers to be ready..."
kubectl wait --for=condition=available deployment/workers-blue -n production --timeout=300s

# Deploy ingress
echo ""
echo "Deploying ingress..."
kubectl apply -f ingress.yaml

# Display deployment status
echo ""
echo "=========================================="
echo "Production Environment Setup Complete!"
echo "=========================================="
echo ""
echo "Deployment Status:"
kubectl get deployments -n production
echo ""
echo "Services:"
kubectl get services -n production
echo ""
echo "Ingress:"
kubectl get ingress -n production
echo ""
echo "Pods:"
kubectl get pods -n production
echo ""
echo "HPA Status:"
kubectl get hpa -n production
echo ""
echo "=========================================="
echo "Next Steps:"
echo ""
echo "1. Run database migrations:"
echo "   kubectl run prisma-migrate --rm -i --tty \\"
echo "     --image=ghcr.io/your-org/ai-video-dubbing-platform-backend:main \\"
echo "     --restart=Never \\"
echo "     --env=\"DATABASE_URL=postgresql://dubbing_prod:PASSWORD@postgres-service:5432/dubbing_prod\" \\"
echo "     -n production \\"
echo "     -- npm run prisma:migrate:deploy"
echo ""
echo "2. Verify health endpoints:"
echo "   curl https://api.dubbing-platform.example.com/health"
echo ""
echo "3. Check logs if needed:"
echo "   kubectl logs -f deployment/backend-blue -n production"
echo "   kubectl logs -f deployment/frontend-blue -n production"
echo "   kubectl logs -f deployment/workers-blue -n production"
echo ""
echo "4. Monitor the deployment:"
echo "   - Check Grafana dashboards"
echo "   - Monitor Sentry for errors"
echo "   - Watch DataDog metrics"
echo ""
echo "5. Blue-Green Deployment:"
echo "   - Blue environment is currently active"
echo "   - Green environment is deployed but not receiving traffic"
echo "   - To switch to green, update service selectors (see deployment runbook)"
echo ""
echo "=========================================="
echo "⚠️  IMPORTANT REMINDERS:"
echo "- Set up database backups (CronJob is configured)"
echo "- Configure S3 lifecycle policies"
echo "- Set up monitoring alerts"
echo "- Review and test rollback procedures"
echo "- Keep blue environment running as backup"
echo "=========================================="
