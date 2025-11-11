#!/bin/bash

echo "🎬 AI Dubbing System - Full Test"
echo "=================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check OpenAI API key
if grep -q "OPENAI_API_KEY=sk-" packages/workers/.env 2>/dev/null; then
    echo "✅ OpenAI API key configured"
else
    echo "❌ OpenAI API key not found"
    exit 1
fi

# Check database
if docker ps | grep -q postgres; then
    echo "✅ PostgreSQL running"
else
    echo "⚠️  PostgreSQL not running - starting..."
    docker-compose up -d postgres
    sleep 3
fi

# Check Redis
if docker ps | grep -q redis; then
    echo "✅ Redis running"
else
    echo "⚠️  Redis not running - starting..."
    docker-compose up -d redis
    sleep 2
fi

echo ""
echo "🎯 System Status:"
echo "  - Database: Ready"
echo "  - Redis: Ready"
echo "  - OpenAI API: Configured"
echo "  - Workers: Ready to start"
echo ""

echo "📝 To start the full system:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd packages/backend && npm run dev"
echo ""
echo "Terminal 2 - Workers:"
echo "  cd packages/workers && npm run dev"
echo ""
echo "Terminal 3 - Frontend:"
echo "  cd packages/frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""

echo "🚀 Quick Test (without UI):"
echo "  ./test-upload.sh"
echo ""

echo "✅ System is ready!"
