#!/bin/bash

echo "🧪 Testing Complete AI Dubbing System with YourTTS"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check services
echo "📋 Checking Services..."
echo ""

# Check Redis
if docker ps | grep -q dubbing-redis; then
    echo -e "${GREEN}✅ Redis${NC}"
else
    echo -e "${RED}❌ Redis not running${NC}"
    echo "   Start with: docker-compose up -d redis"
    exit 1
fi

# Check PostgreSQL
if docker ps | grep -q dubbing-postgres; then
    echo -e "${GREEN}✅ PostgreSQL${NC}"
else
    echo -e "${RED}❌ PostgreSQL not running${NC}"
    echo "   Start with: docker-compose up -d postgres"
    exit 1
fi

# Check YourTTS
if curl -s http://localhost:8007/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ YourTTS (Voice Cloning)${NC}"
else
    echo -e "${RED}❌ YourTTS not running${NC}"
    echo "   Start with: ./START_YOURTTS.sh"
    exit 1
fi

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not running${NC}"
    echo "   Starting backend..."
    cd packages/backend && npm run dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
    sleep 5
fi

echo ""
echo "🎬 Testing Video Upload..."
echo ""

# Check if test video exists
if [ ! -f "test-video.mov" ]; then
    echo -e "${RED}❌ test-video.mov not found${NC}"
    echo "   Please add a test video file"
    exit 1
fi

# Upload video
echo "📤 Uploading test video..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en")

# Extract job ID
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Upload failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Video uploaded${NC}"
echo "   Job ID: $JOB_ID"
echo ""

echo "🔄 Processing Pipeline..."
echo ""
echo "This will:"
echo "  1. 🎤 Transcribe with OpenAI Whisper"
echo "  2. 🌍 Translate with OpenAI GPT-4"
echo "  3. 🎙️  Generate voice with YourTTS (voice cloning!)"
echo "  4. 🎬 Sync audio with video"
echo ""

# Monitor job status
echo "📊 Monitoring job status..."
echo ""

MAX_WAIT=300  # 5 minutes
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/dub/status/$JOB_ID)
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    if [ "$STATUS" = "completed" ]; then
        echo -e "${GREEN}✅ Job completed!${NC}"
        echo ""
        echo "📥 Download your dubbed video:"
        echo "   curl -O http://localhost:3001/api/dub/download/$JOB_ID"
        echo ""
        echo "🎉 Success! Your video has been:"
        echo "   ✅ Transcribed (OpenAI Whisper)"
        echo "   ✅ Translated (OpenAI GPT-4)"
        echo "   ✅ Voice cloned (YourTTS)"
        echo "   ✅ Synced with video"
        echo ""
        exit 0
    elif [ "$STATUS" = "failed" ]; then
        echo -e "${RED}❌ Job failed${NC}"
        ERROR=$(echo $STATUS_RESPONSE | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo "   Error: $ERROR"
        exit 1
    else
        echo -ne "\r   Status: $STATUS | Progress: ${PROGRESS}%   "
        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    fi
done

echo ""
echo -e "${YELLOW}⚠️  Job still processing after ${MAX_WAIT}s${NC}"
echo "   Check status: curl http://localhost:3001/api/dub/status/$JOB_ID"
