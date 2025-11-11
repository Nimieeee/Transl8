#!/bin/bash

# Quick TTS-Validated Pipeline Test
# Uploads a video and monitors the TTS-validated loop

set -e

echo "🚀 TTS-Validated Pipeline Test"
echo "================================"
echo ""

# Deactivate any Python venv
if [ -n "$VIRTUAL_ENV" ]; then
    echo "Deactivating Python virtual environment..."
    deactivate 2>/dev/null || true
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Upload video
echo -e "${BLUE}Uploading test video...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en")

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
    echo "❌ Upload failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Video uploaded${NC}"
echo "Job ID: $JOB_ID"
echo ""

# Monitor progress
echo -e "${BLUE}Monitoring pipeline (watch for TTS validation)...${NC}"
echo "Press Ctrl+C to stop monitoring"
echo ""

MAX_WAIT=600
ELAPSED=0
INTERVAL=3

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/dub/status/$JOB_ID)
    STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
    PROGRESS=$(echo $STATUS_RESPONSE | jq -r '.progress')
    
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Status: $STATUS | Progress: $PROGRESS%"
    
    if [ "$STATUS" == "completed" ]; then
        echo ""
        echo -e "${GREEN}✓ Pipeline completed!${NC}"
        break
    elif [ "$STATUS" == "failed" ]; then
        echo ""
        echo "❌ Pipeline failed"
        ERROR=$(echo $STATUS_RESPONSE | jq -r '.error')
        echo "Error: $ERROR"
        exit 1
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "================================"
echo "📊 Checking TTS Validation Results"
echo "================================"
echo ""

# Check Context Map
CONTEXT_MAP=$(curl -s http://localhost:3001/api/context-map/$JOB_ID)

if [ -n "$CONTEXT_MAP" ] && [ "$CONTEXT_MAP" != "null" ]; then
    TOTAL=$(echo $CONTEXT_MAP | jq '.segments | length')
    VALIDATED=$(echo $CONTEXT_MAP | jq '[.segments[] | select(.validatedAudioPath != null)] | length')
    SUCCESS=$(echo $CONTEXT_MAP | jq '[.segments[] | select(.status == "success")] | length')
    
    echo "Total segments: $TOTAL"
    echo "Validated segments: $VALIDATED"
    echo "Successful validations: $SUCCESS"
    
    if [ "$SUCCESS" -gt 0 ]; then
        SUCCESS_RATE=$(echo "scale=1; $SUCCESS * 100 / $TOTAL" | bc)
        echo -e "${GREEN}Success rate: ${SUCCESS_RATE}%${NC}"
    fi
    
    # Show sample segment
    echo ""
    echo "Sample validated segment:"
    echo $CONTEXT_MAP | jq '.segments[0] | {
        text: .text[0:60],
        adapted_text: .adapted_text[0:60],
        duration,
        actualDuration,
        status,
        attempts
    }'
fi

echo ""
echo "================================"
echo "✅ Test Complete"
echo "================================"
echo ""
echo "View full Context Map:"
echo "  curl http://localhost:3001/api/context-map/$JOB_ID | jq"
echo ""
echo "Download video:"
echo "  curl -o output.mp4 http://localhost:3001/api/dub/download/$JOB_ID"
echo ""
