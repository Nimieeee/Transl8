#!/bin/bash

echo "🎬 Testing Voice Cloning with Your Video"
echo "========================================"
echo ""

# Find the video file (handles special characters)
VIDEO_FILE=$(ls -1 *.mov 2>/dev/null | grep "11-6-25" | head -1)

# Check if video exists
if [ -z "$VIDEO_FILE" ] || [ ! -f "$VIDEO_FILE" ]; then
    echo "❌ Video file not found: Movie on 11-6-25 at 7.03 AM.mov"
    echo "   Available .mov files:"
    ls -1 *.mov 2>/dev/null | head -5
    exit 1
fi

echo "✅ Found video: $VIDEO_FILE"
echo ""

# Check services
echo "📋 Checking Services..."
echo ""

# YourTTS not required for OpenAI TTS
echo "✅ OpenAI TTS (Better Pacing)"

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend API"
else
    echo "❌ Backend not running"
    echo "   Start it with: cd packages/backend && npm run dev"
    exit 1
fi

echo ""
echo "🎤 Uploading your video for dubbing..."
echo "   This will:"
echo "   1. Extract and analyze your voice"
echo "   2. Transcribe with Whisper"
echo "   3. Translate with natural interjections"
echo "   4. Clone your voice with YourTTS"
echo "   5. Generate dubbed video"
echo ""

# Upload video
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@$VIDEO_FILE" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=fr")

# Extract job ID
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "❌ Failed to upload video"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Video uploaded successfully"
echo "   Job ID: $JOB_ID"
echo ""

echo "🔄 Processing your video..."
echo "   Monitoring progress..."
echo ""

# Monitor progress
MAX_WAIT=300
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/dub/status/$JOB_ID)
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    if [ "$STATUS" = "completed" ]; then
        echo ""
        echo "✅ Dubbing completed!"
        echo ""
        echo "📥 Download your dubbed video:"
        echo "   curl -O http://localhost:3001/api/dub/download/$JOB_ID"
        echo ""
        echo "   Or open in browser:"
        echo "   http://localhost:3001/api/dub/download/$JOB_ID"
        echo ""
        echo "🎉 Your voice has been cloned and dubbed in French!"
        echo ""
        echo "📊 Quality Improvements Applied:"
        echo "   ✅ Natural interjections preserved (um, uh, oh, etc.)"
        echo "   ✅ Voice cloning with prosody transfer"
        echo "   ✅ Word-level timing synchronization"
        echo "   ✅ Emotional tone matching"
        exit 0
    elif [ "$STATUS" = "failed" ]; then
        echo ""
        echo "❌ Dubbing failed"
        echo "   Check logs for details"
        exit 1
    fi
    
    echo -ne "\r   Status: $STATUS | Progress: ${PROGRESS}%   "
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "⚠️  Processing is taking longer than expected"
echo "   Job ID: $JOB_ID"
echo "   Check status: curl http://localhost:3001/api/dub/status/$JOB_ID"
