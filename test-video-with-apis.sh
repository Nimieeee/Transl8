#!/bin/bash

# Test Video Dubbing with API-Based Services
# Uses: OpenAI Whisper API + Gemini API (no Docker services needed)

set -e

echo "🎬 Testing AI Video Dubbing System"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find the video file
VIDEO_FILE=""
if [ -f "./Movie on 11-1-25 at 2.33 PM.mov" ]; then
    VIDEO_FILE="./Movie on 11-1-25 at 2.33 PM.mov"
elif [ -f "./test-video.mov" ]; then
    VIDEO_FILE="./test-video.mov"
else
    # Try to find any .mov file
    VIDEO_FILE=$(find . -maxdepth 1 -name "*.mov" -type f | head -1)
fi

if [ -z "$VIDEO_FILE" ]; then
    echo -e "${RED}❌ No video file found${NC}"
    echo "Please ensure a .mov file exists in the current directory"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found video: $VIDEO_FILE"
echo ""

# Check if services are running
echo "📋 Checking Services..."
echo "----------------------"

# Check PostgreSQL
if docker ps | grep -q dubbing-postgres; then
    echo -e "${GREEN}✓${NC} PostgreSQL running"
else
    echo -e "${RED}✗${NC} PostgreSQL not running"
    echo "  Start with: docker-compose up -d postgres"
    exit 1
fi

# Check Redis
if docker ps | grep -q dubbing-redis; then
    echo -e "${GREEN}✓${NC} Redis running"
else
    echo -e "${RED}✗${NC} Redis not running"
    echo "  Start with: docker-compose up -d redis"
    exit 1
fi

# Check Backend API
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API running (port 3001)"
else
    echo -e "${YELLOW}⚠${NC}  Backend API not responding"
    echo "  Start with: cd packages/backend && npm run dev"
    echo ""
    echo "Please start the backend and try again"
    exit 1
fi

# Check Workers
if pgrep -f "tsx watch src/index.ts" > /dev/null; then
    echo -e "${GREEN}✓${NC} Workers running"
else
    echo -e "${YELLOW}⚠${NC}  Workers not detected"
    echo "  Start with: cd packages/workers && npm run dev"
fi

echo ""
echo "📊 Configuration..."
echo "-------------------"

# Check API keys
if grep -q "OPENAI_API_KEY=sk-" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OpenAI API key configured"
else
    echo -e "${RED}✗${NC} OpenAI API key not configured"
    exit 1
fi

if grep -q "GEMINI_API_KEY=" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Gemini API key configured"
else
    echo -e "${YELLOW}⚠${NC}  Gemini API key not configured (optional)"
fi

if grep -q "USE_OPENAI_WHISPER=true" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Using OpenAI Whisper API (no local service needed)"
else
    echo -e "${YELLOW}⚠${NC}  OpenAI Whisper not enabled"
fi

echo ""
echo "🎯 Test Plan..."
echo "---------------"
echo "1. Upload video via API"
echo "2. Transcribe with OpenAI Whisper"
echo "3. Translate with Gemini (if configured)"
echo "4. Monitor progress"
echo ""

# Get video info
echo "📹 Video Information..."
echo "----------------------"
if command -v ffprobe &> /dev/null; then
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null | cut -d. -f1)
    echo "Duration: ${DURATION}s"
    
    # Estimate cost
    MINUTES=$((DURATION / 60 + 1))
    WHISPER_COST=$(echo "scale=4; $MINUTES * 0.006" | bc)
    echo "Estimated OpenAI Whisper cost: \$$WHISPER_COST"
else
    echo "ffprobe not available - skipping video info"
fi

echo ""
echo "🚀 Starting Test..."
echo "-------------------"

# Create a test using curl
echo "Uploading video..."

# First, create a project
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test - '"$(date +%Y-%m-%d\ %H:%M:%S)"'",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }')

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to create project"
    exit 1
fi

PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗${NC} Failed to get project ID"
    echo "Response: $PROJECT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓${NC} Project created: $PROJECT_ID"

# Upload video
echo "Uploading video file..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/projects/$PROJECT_ID/upload \
  -F "video=@$VIDEO_FILE")

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to upload video"
    exit 1
fi

echo -e "${GREEN}✓${NC} Video uploaded"
echo ""

# Monitor progress
echo "📊 Monitoring Progress..."
echo "------------------------"
echo "Project ID: $PROJECT_ID"
echo ""

for i in {1..30}; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/projects/$PROJECT_ID)
    
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    echo -ne "\rStatus: $STATUS | Progress: ${PROGRESS}%"
    
    if [ "$STATUS" = "COMPLETED" ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Processing complete!"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo ""
        echo -e "${RED}✗${NC} Processing failed"
        echo "Response: $STATUS_RESPONSE"
        exit 1
    fi
    
    sleep 2
done

echo ""
echo ""
echo "✅ Test Complete!"
echo "================="
echo ""
echo "📋 Results:"
echo "  Project ID: $PROJECT_ID"
echo "  Status: $STATUS"
echo ""
echo "🔍 View Results:"
echo "  API: curl http://localhost:3001/api/projects/$PROJECT_ID"
echo "  Frontend: http://localhost:3000/projects/$PROJECT_ID"
echo ""
echo "📊 Check Logs:"
echo "  Backend: packages/backend logs"
echo "  Workers: packages/workers logs"
echo ""

# Show transcript if available
TRANSCRIPT=$(echo $STATUS_RESPONSE | grep -o '"transcript":{[^}]*}')
if [ ! -z "$TRANSCRIPT" ]; then
    echo "📝 Transcript Preview:"
    echo "$TRANSCRIPT" | head -5
    echo ""
fi

echo "🎉 Test completed successfully!"
