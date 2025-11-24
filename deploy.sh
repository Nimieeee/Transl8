#!/bin/bash

echo "🚀 Deployment Script for Transl8"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the project root."
    exit 1
fi

echo "📝 Step 1: Committing changes..."
git add .
git commit -m "Fix API URL configuration and deployment setup" || echo "No changes to commit"

echo ""
echo "📤 Step 2: Pushing to repository..."
git push

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. VERCEL SETUP:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Select your project"
echo "   - Go to: Settings → Environment Variables"
echo "   - Add: NEXT_PUBLIC_API_URL = https://transl8.onrender.com/api"
echo "   - Apply to: Production, Preview, Development"
echo ""
echo "2. REDEPLOY VERCEL:"
echo "   - Go to: Deployments tab"
echo "   - Click '...' on latest deployment"
echo "   - Select 'Redeploy'"
echo "   - UNCHECK 'Use existing Build Cache'"
echo "   - Click 'Redeploy'"
echo ""
echo "3. VERIFY RENDER BACKEND:"
echo "   - Check: https://transl8.onrender.com/health"
echo "   - Should return: {\"status\":\"ok\",\"timestamp\":\"...\"}"
echo ""
echo "4. UPDATE RENDER ENVIRONMENT:"
echo "   - Go to: https://dashboard.render.com"
echo "   - Select: transl8-app service"
echo "   - Go to: Environment"
echo "   - Set FRONTEND_URL to your Vercel URL (e.g., https://transl8-frontend.vercel.app)"
echo ""
echo "5. TEST YOUR DEPLOYMENT:"
echo "   - Visit your Vercel URL"
echo "   - Open browser DevTools → Network tab"
echo "   - Create a project"
echo "   - Verify requests go to: https://transl8.onrender.com/api/projects"
echo ""
echo "📚 For detailed instructions, see: DEPLOYMENT_VERIFICATION.md"
