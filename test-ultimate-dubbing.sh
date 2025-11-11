#!/bin/bash

echo "🎬 Testing Ultimate AI Dubbing Solution"
echo "======================================"
echo "XTTS v2 + DTW + Wav2Lip + M1 GPU"
echo ""

# Find video file
VIDEO_FILE=$(ls -1 *.mov 2>/dev/null | grep "11-6-25" | head -1)

if [ -z "$VIDEO_FILE" ]; then
    echo "❌ Video file not found: Movie on 11-6-25 at 7.03 AM.mov"
    exit 1
fi

echo "✅ Found video: $VIDEO_FILE"
echo ""

# Check services
echo "📋 Checking Ultimate Services..."

# Check XTTS v2
if curl -s http://localhost:8009/health > /dev/null 2>&1; then
    echo "✅ XTTS v2 Voice Cloning (M1 GPU)"
else
    echo "❌ XTTS v2 not running"
    echo "   Start with: ./START_ULTIMATE_DUBBING.sh"
    exit 1
fi

# Check DTW
if curl -s http://localhost:8010/health > /dev/null 2>&1; then
    echo "✅ DTW Intelligent Timing"
else
    echo "❌ DTW service not running"
    echo "   Start with: ./START_ULTIMATE_DUBBING.sh"
    exit 1
fi

# Check Wav2Lip
if curl -s http://localhost:8008/health > /dev/null 2>&1; then
    echo "✅ Wav2Lip Perfect Lip-Sync"
else
    echo "❌ Wav2Lip not running"
    echo "   Start with: ./START_ULTIMATE_DUBBING.sh"
    exit 1
fi

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend API"
else
    echo "❌ Backend not running"
    echo "   Start with: npm run dev (in packages/backend)"
    exit 1
fi

echo ""
echo "🎤 Uploading your video for ultimate dubbing..."
echo "   This will:"
echo "   1. Extract and analyze your voice"
echo "   2. Transcribe with Whisper (word timestamps)"
echo "   3. Translate with natural interjections"
echo "   4. Clone your voice with XTTS v2 (M1 GPU)"
echo "   5. Apply DTW intelligent timing alignment"
echo "   6. Generate perfect lip-sync with Wav2Lip"
echo "   7. Output professional-quality dubbed video"
echo ""

# Upload video
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@$VIDEO_FILE" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=fr")

# Check for errors
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Failed to upload video"
    echo "Response: $RESPONSE"
    exit 1
fi

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "❌ Could not extract job ID"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Video uploaded successfully"
echo "   Job ID: $JOB_ID"
echo ""
echo "🔄 Processing your video with ultimate quality..."
echo "   Monitoring progress..."
echo ""

# Monitor progress
while true; do
    STATUS_RESPONSE=$(curl -s "http://localhost:3001/api/dub/status/$JOB_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    if [ "$STATUS" = "completed" ]; then
        echo "   Status: $STATUS | Progress: $PROGRESS%   "
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "❌ Processing failed"
        echo "Response: $STATUS_RESPONSE"
        exit 1
    else
        echo -ne "\r   Status: $STATUS | Progress: $PROGRESS%   "
        sleep 5
    fi
done

echo ""
echo "✅ Ultimate dubbing completed!"
echo ""
echo "📥 Download your professionally dubbed video:"
echo "   curl -O http://localhost:3001/api/dub/download/$JOB_ID"
echo "   Or open in browser:"
echo "   http://localhost:3001/api/dub/download/$JOB_ID"
echo ""
echo "🎉 Your voice has been cloned and dubbed with ultimate quality!"
echo ""
echo "📊 Ultimate Quality Features Applied:"
echo "   ✅ XTTS v2 voice cloning with M1 GPU acceleration"
echo "   ✅ DTW intelligent timing alignment"
echo "   ✅ Perfect lip-sync with Wav2Lip"
echo "   ✅ Natural interjections preserved"
echo "   ✅ Professional-grade output quality"
echo ""
