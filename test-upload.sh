#!/bin/bash

echo "🎬 Testing Video Dubbing System"
echo "================================"
echo ""

# Find the first available video file
VIDEO_FILE=$(find packages/backend/uploads -type f \( -name "*.mov" -o -name "*.mp4" \) 2>/dev/null | head -1)

if [ -z "$VIDEO_FILE" ] || [ ! -f "$VIDEO_FILE" ]; then
    echo "❌ No video files found in packages/backend/uploads/"
    echo "Please place a test video (MP4 or MOV) in packages/backend/uploads/"
    exit 1
fi

echo "📹 Video file: $VIDEO_FILE"
echo "📊 File size: $(ls -lh "$VIDEO_FILE" | awk '{print $5}')"
echo ""

# Upload the video
echo "⬆️  Uploading video..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@$VIDEO_FILE" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en")

echo "Response: $RESPONSE"
echo ""

# Extract job ID
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "❌ Failed to get job ID"
    echo "Response was: $RESPONSE"
    exit 1
fi

echo "✅ Upload successful!"
echo "🆔 Job ID: $JOB_ID"
echo ""
echo "📊 Monitoring progress..."
echo ""

# Monitor progress
for i in {1..60}; do
    STATUS=$(curl -s "http://localhost:3001/api/dub/status/$JOB_ID")
    
    CURRENT_STATUS=$(echo $STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo $STATUS | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    ERROR=$(echo $STATUS | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    
    echo "[$i] Status: $CURRENT_STATUS | Progress: $PROGRESS%"
    
    if [ "$ERROR" != "" ] && [ "$ERROR" != "null" ]; then
        echo "❌ Error: $ERROR"
        break
    fi
    
    if [ "$CURRENT_STATUS" = "completed" ]; then
        echo ""
        echo "✅ Dubbing completed!"
        echo "📥 Download: http://localhost:3001/api/dub/download/$JOB_ID"
        break
    fi
    
    if [ "$CURRENT_STATUS" = "failed" ]; then
        echo ""
        echo "❌ Dubbing failed"
        break
    fi
    
    sleep 2
done

echo ""
echo "🎉 Test complete!"
