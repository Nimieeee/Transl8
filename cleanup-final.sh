#!/bin/bash

echo "🧹 Cleaning up repository..."

# Remove old backend files
echo "Removing old backend files..."
rm -rf packages/backend/src/routes_old
rm -rf packages/backend/src/lib_old
rm -rf packages/backend/src/adapters_old
rm -rf packages/backend/src/adapters
rm -rf packages/backend/src/config
rm -rf packages/backend/uploads
rm -rf packages/backend/tests

# Remove old worker files
echo "Removing old worker files..."
rm -rf packages/workers/src/old
rm -rf packages/workers/src/lib/old
rm -rf packages/workers/python
rm -rf packages/workers/docker
rm -rf packages/workers/temp

# Remove old frontend files
echo "Removing old frontend files..."
rm -rf packages/frontend/src/components/old
rm -rf packages/frontend/src/old
rm -rf packages/frontend/src/hooks
rm -rf packages/frontend/src/providers
rm -rf packages/frontend/src/types

# Remove benchmarks
echo "Removing benchmarks..."
rm -rf packages/benchmarks

# Remove shared package (not used)
echo "Removing shared package..."
rm -rf packages/shared

# Remove k8s configs (not needed for Render/Vercel)
echo "Removing k8s configs..."
rm -rf k8s

# Remove old documentation
echo "Removing old documentation..."
rm -f ALTERNATIVE_DEPLOYMENT_OPTIONS.md
rm -f BACKEND_HEALTH_CHECK.md
rm -f CLEANUP_SUMMARY.md
rm -f DEPLOYMENT_QUICK_START.md
rm -f DEPLOYMENT_STATUS.md
rm -f FLY_DEPLOYMENT.md
rm -f RAILWAY_DEPLOYMENT.md
rm -f RAILWAY_ENV_SETUP.md
rm -f RENDER_DEPLOYMENT.md
rm -f RENDER_DASHBOARD_CONFIG.md
rm -f TYPESCRIPT_FIXES_SUMMARY.md
rm -f VERCEL_DEPLOYMENT.md

# Remove old backend docs
echo "Removing old backend docs..."
rm -f packages/backend/ADAPTATION_ENGINE.md
rm -f packages/backend/ADAPTATION_QUICK_START.md
rm -f packages/backend/AUTH_README.md
rm -f packages/backend/CONTEXT_MAP.md
rm -f packages/backend/DATABASE.md
rm -f packages/backend/IMPLEMENTATION_SUMMARY.md
rm -f packages/backend/JOB_QUEUE.md
rm -f packages/backend/LOG_AGGREGATION.md
rm -f packages/backend/MIGRATION_GUIDE.md
rm -f packages/backend/MONITORING.md
rm -f packages/backend/OBSERVABILITY_SETUP.md
rm -f packages/backend/PROJECT_MANAGEMENT_API.md
rm -f packages/backend/QUICK_START.md
rm -f packages/backend/STORAGE_UPLOAD.md
rm -f packages/backend/TLS_CONFIGURATION.md
rm -f packages/backend/TRANSCRIPT_TRANSLATION_API.md
rm -f packages/backend/VOCAL_ISOLATION.md
rm -f packages/backend/VOICE_MANAGEMENT.md

# Remove old worker docs
echo "Removing old worker docs..."
rm -f packages/workers/ABSOLUTE_SYNC_IMPLEMENTATION.md
rm -f packages/workers/ABSOLUTE_SYNC_QUICK_START.md
rm -f packages/workers/IMPLEMENTATION_SUMMARY.md
rm -f packages/workers/QUICK_START.md
rm -f packages/workers/SETUP.md

# Remove old scripts
echo "Removing old scripts..."
rm -f build-render.sh
rm -f cleanup-repo.sh
rm -f cleanup-unused-components.sh
rm -f fix-typescript-errors.sh
rm -f SETUP_CHATTERBOX_MPS.sh
rm -f start-dev.sh
rm -f start-with-workers.js
rm -f packages/backend/start.js
rm -f packages/backend/test-cli-dubbing.ts

# Remove old Docker files
echo "Removing old Docker files..."
rm -f Dockerfile
rm -f packages/backend/Dockerfile

# Remove old config files
echo "Removing old config files..."
rm -f packages/frontend/sentry.client.config.ts

# Remove .kiro specs (development only)
echo "Removing .kiro specs..."
rm -rf .kiro/specs

# Remove docs folder (old architecture docs)
echo "Removing old docs..."
rm -rf docs

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Kept files:"
echo "  - Core source code (backend, workers, frontend)"
echo "  - Deployment configs (render.yaml, vercel.json)"
echo "  - Database schema (supabase-schema.sql)"
echo "  - Deployment guides"
echo "  - Package configs"
echo ""
