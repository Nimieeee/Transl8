#!/bin/bash

echo "🎬 Transl8 - Quick Deployment Script"
echo "===================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized. Run: git init"
    exit 1
fi

# Check if remote is set
if ! git remote | grep -q origin; then
    echo "❌ Git remote not set. Run: git remote add origin https://github.com/Nimieeee/Transl8.git"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm run install:all || { echo "❌ Installation failed"; exit 1; }

echo ""
echo "🔨 Step 2: Building all packages..."
npm run build:all || { echo "❌ Build failed"; exit 1; }

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update .env.production with your credentials:"
echo "   - Supabase database password"
echo "   - Upstash Redis URL (create at https://console.upstash.com)"
echo "   - OpenAI API key"
echo "   - Mistral API key"
echo ""
echo "2. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Initial Transl8 deployment'"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy Frontend (Vercel):"
echo "   - Go to https://vercel.com/new"
echo "   - Import: Nimieeee/Transl8"
echo "   - Root Directory: packages/frontend"
echo "   - Deploy!"
echo ""
echo "4. Deploy Backend (Render):"
echo "   - Go to https://dashboard.render.com"
echo "   - New Web Service"
echo "   - Root Directory: packages/backend"
echo "   - Add environment variables from .env.production"
echo ""
echo "5. Deploy Workers (Render):"
echo "   - New Background Worker"
echo "   - Root Directory: packages/workers"
echo "   - Add same environment variables"
echo ""
echo "📖 See DEPLOYMENT_CHECKLIST.md for detailed instructions"
echo ""
