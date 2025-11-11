#!/bin/bash

echo "🤖 AI Dubbing Platform - Test Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "📋 Checking Services..."
echo "----------------------"

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend running${NC}"
else
    echo -e "${RED}❌ Backend not running${NC}"
    echo "   Start with: cd packages/backend && npm run dev"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not running (optional)${NC}"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis running${NC}"
else
    echo -e "${RED}❌ Redis not running${NC}"
    echo "   Start with: redis-server"
fi

# Check PostgreSQL
if psql -U postgres -d dubbing_platform -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL running${NC}"
else
    echo -e "${RED}❌ PostgreSQL not running${NC}"
    echo "   Start with: brew services start postgresql"
fi

# Check Worker
if ps aux | grep -v grep | grep "tsx watch" > /dev/null; then
    echo -e "${GREEN}✅ Worker running${NC}"
else
    echo -e "${RED}❌ Worker not running${NC}"
    echo "   Start with: cd packages/workers && npx tsx watch src/dubbing-only.ts"
fi

echo ""
echo "🔧 Checking Configuration..."
echo "---------------------------"

# Check OpenAI API key
if grep -q "OPENAI_API_KEY=sk-" packages/workers/.env 2>/dev/null; then
    echo -e "${GREEN}✅ OpenAI API key configured${NC}"
elif grep -q "OPENAI_API_KEY=your_" packages/workers/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  OpenAI API key needs to be set${NC}"
    echo "   Edit packages/workers/.env and add your key"
else
    echo -e "${RED}❌ OpenAI API key not found${NC}"
    echo "   Add to packages/workers/.env: OPENAI_API_KEY=sk-your-key"
fi

# Check YourTTS service
if curl -s http://localhost:8007/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ YourTTS service running (voice cloning enabled)${NC}"
else
    echo -e "${YELLOW}⚠️  YourTTS not running (voice cloning disabled)${NC}"
    echo "   Optional: Start with docker run -p 8007:8007 yourtts-service"
fi

echo ""
echo "🧪 Test Options..."
echo "-----------------"

if [ -f "test-video.mov" ]; then
    echo -e "${GREEN}✅ Test video found: test-video.mov${NC}"
    echo ""
    echo "Run test with:"
    echo "  ./test-upload.sh"
    echo ""
    echo "Or manually:"
    echo "  curl -X POST http://localhost:3001/api/dub/upload \\"
    echo "    -F \"video=@test-video.mov\" \\"
    echo "    -F \"targetLanguage=es\" \\"
    echo "    -F \"sourceLanguage=en\""
else
    echo -e "${YELLOW}⚠️  No test video found${NC}"
    echo "   Place a video file as 'test-video.mov' to test"
fi

echo ""
echo "📖 Documentation..."
echo "------------------"
echo "  Quick Start: OPENAI_YOURTTS_SETUP.md"
echo "  Voice Cloning: VOICE_CLONING_SETUP.md"
echo "  Complete Guide: AI_DUBBING_COMPLETE.md"

echo ""
echo "💰 Cost Estimate..."
echo "------------------"
echo "  With OpenAI only: ~$0.09 per 5-min video"
echo "  With YourTTS: ~$0.04 per 5-min video"

echo ""
echo "🎯 Next Steps..."
echo "---------------"

if ! grep -q "OPENAI_API_KEY=sk-" packages/workers/.env 2>/dev/null; then
    echo "1. Add OpenAI API key to packages/workers/.env"
    echo "2. Get key from: https://platform.openai.com/api-keys"
    echo "3. Test with: ./test-upload.sh"
else
    echo "✅ Ready to test! Run: ./test-upload.sh"
fi

echo ""
