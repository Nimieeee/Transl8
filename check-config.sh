#!/bin/bash

echo "🔍 Configuration Check for Transl8"
echo "=================================="
echo ""

echo "📁 Frontend Configuration:"
echo "-------------------------"
echo "1. api-client.ts baseURL:"
grep -A 1 "const API_URL" packages/frontend/src/lib/api-client.ts | head -2
echo ""

echo "2. next.config.js env:"
grep -A 1 "NEXT_PUBLIC_API_URL" packages/frontend/next.config.js | head -2
echo ""

echo "3. .env.local:"
if [ -f "packages/frontend/.env.local" ]; then
    cat packages/frontend/.env.local
else
    echo "   ⚠️  .env.local not found"
fi
echo ""

echo "4. .env.example:"
cat packages/frontend/.env.example
echo ""

echo "📁 Backend Configuration:"
echo "------------------------"
echo "1. Routes mounted at:"
grep "app.use('/api" packages/backend/src/index.ts
echo ""

echo "2. PORT configuration:"
grep "const PORT" packages/backend/src/index.ts
echo ""

echo "3. CORS configuration:"
grep -A 2 "frontendUrl" packages/backend/src/index.ts | head -3
echo ""

echo "📋 Summary:"
echo "----------"
echo "✅ Frontend should call: https://transl8.onrender.com/api/projects"
echo "✅ Backend exposes: /api/projects, /api/dub"
echo "✅ Backend health check: /health"
echo ""
echo "⚠️  IMPORTANT: After pushing, you MUST:"
echo "   1. Set NEXT_PUBLIC_API_URL in Vercel dashboard"
echo "   2. Redeploy WITHOUT build cache"
echo "   3. Set FRONTEND_URL in Render dashboard"
