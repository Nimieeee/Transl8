#!/bin/bash

echo "🔍 Verifying Deployment Readiness..."
echo ""

ERRORS=0

# Check if builds pass
echo "1. Checking builds..."

echo "   - Backend build..."
cd packages/backend && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Backend builds successfully"
else
    echo "     ❌ Backend build failed"
    ERRORS=$((ERRORS + 1))
fi

echo "   - Workers build..."
cd ../workers && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Workers build successfully"
else
    echo "     ❌ Workers build failed"
    ERRORS=$((ERRORS + 1))
fi

echo "   - Frontend build..."
cd ../frontend && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "     ✅ Frontend builds successfully"
else
    echo "     ❌ Frontend build failed"
    ERRORS=$((ERRORS + 1))
fi

cd ../../..

echo ""
echo "2. Checking deployment files..."

FILES=(
    "render.yaml"
    "vercel.json"
    "supabase-schema.sql"
    "packages/backend/.env.production"
    "packages/frontend/.env.production"
    "DEPLOYMENT_GUIDE.md"
    "DEPLOY_CHECKLIST.md"
    "QUICK_DEPLOY.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "3. Checking required files..."

REQUIRED=(
    "packages/backend/src/index.ts"
    "packages/backend/src/routes/auth.ts"
    "packages/backend/src/routes/projects.ts"
    "packages/backend/src/routes/dub.ts"
    "packages/backend/src/lib/prisma.ts"
    "packages/backend/src/lib/queue.ts"
    "packages/backend/src/lib/storage.ts"
    "packages/backend/src/middleware/auth.ts"
    "packages/backend/src/middleware/error-handler.ts"
    "packages/workers/src/index.ts"
    "packages/workers/src/stt-worker.ts"
    "packages/workers/src/translation-worker.ts"
    "packages/workers/src/tts-worker.ts"
    "packages/workers/src/muxing-worker.ts"
    "packages/frontend/src/app/page.tsx"
    "packages/frontend/src/app/dashboard/page.tsx"
    "packages/frontend/src/app/projects/[id]/page.tsx"
    "packages/frontend/src/lib/api-client.ts"
)

for file in "${REQUIRED[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "4. Checking package.json files..."

if [ -f "packages/backend/package.json" ]; then
    echo "   ✅ Backend package.json"
else
    echo "   ❌ Backend package.json missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "packages/workers/package.json" ]; then
    echo "   ✅ Workers package.json"
else
    echo "   ❌ Workers package.json missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "packages/frontend/package.json" ]; then
    echo "   ✅ Frontend package.json"
else
    echo "   ❌ Frontend package.json missing"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "5. Checking Prisma schema..."

if [ -f "packages/backend/prisma/schema.prisma" ]; then
    echo "   ✅ Prisma schema exists"
else
    echo "   ❌ Prisma schema missing"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "1. Push code to GitHub"
    echo "2. Follow DEPLOY_CHECKLIST.md"
    echo "3. Deploy to Render + Vercel + Supabase"
    echo ""
    echo "Quick start: cat QUICK_DEPLOY.md"
    exit 0
else
    echo "❌ Found $ERRORS error(s). Please fix before deploying."
    echo ""
    echo "Run builds manually to see errors:"
    echo "  cd packages/backend && npm run build"
    echo "  cd packages/workers && npm run build"
    echo "  cd packages/frontend && npm run build"
    exit 1
fi
